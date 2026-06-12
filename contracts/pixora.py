# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass

from genlayer import *


@allow_storage
@dataclass
class Room:
    id: str
    host: Address
    name: str
    max_players: u32
    num_teams: u32
    total_rounds: u32
    current_round: u32
    is_active: bool
    is_complete: bool


@allow_storage
@dataclass
class Player:
    username: str
    xp: u256
    games_played: u32


@allow_storage
@dataclass
class Guess:
    guess_text: str
    xp_awarded: u32
    explanation: str


@allow_storage
@dataclass
class Team:
    name: str
    total_xp: u256


class ImageGuessingGame(gl.Contract):
    # Room storage
    rooms: TreeMap[str, Room]

    # Global player registry: addr_hex -> Player
    players: TreeMap[str, Player]

    # Room membership: room_id -> (addr_hex -> username)
    room_players: TreeMap[str, TreeMap[str, str]]

    # Images per room: room_id -> (round_str -> image_url)
    room_images: TreeMap[str, TreeMap[str, str]]

    # Guesses per round: "{room_id}_{round}" -> (addr_hex -> Guess)
    round_guesses: TreeMap[str, TreeMap[str, Guess]]

    # Teams: room_id -> (team_id -> Team)
    room_teams: TreeMap[str, TreeMap[str, Team]]

    # Player-team mapping: room_id -> (addr_hex -> team_id)
    player_teams: TreeMap[str, TreeMap[str, str]]

    # Room counter for generating IDs
    room_counter: u256

    def __init__(self):
        self.room_counter = u256(0)

    # ------------------------------------------------------------------ #
    #  INTERNAL: AI image evaluation (core GenLayer feature)
    # ------------------------------------------------------------------ #

    def _evaluate_guesses_ai(self, room_id: str) -> str:
        """
        Uses gl.nondet.web.render + gl.nondet.exec_prompt with images
        to have validators independently analyze the image and score guesses.
        Returns JSON string with scores via run_nondet_unsafe.
        """
        room = self.rooms[room_id]
        round_key = f"{room_id}_{room.current_round}"
        image_url = self.room_images[room_id][str(room.current_round)]

        # Collect all guesses for this round
        guesses_list = []
        for addr_hex, guess in self.round_guesses[round_key].items():
            guesses_list.append({
                "player": addr_hex,
                "guess": guess.guess_text
            })

        guesses_json = json.dumps(guesses_list, indent=2)

        def leader_fn():
            # Validator renders the image from URL
            screenshot = gl.nondet.web.render(image_url, mode="screenshot")

            prompt = (
                "You are a judge for an image guessing game.\n"
                "Look at this image carefully and evaluate each player's guess.\n\n"
                "PLAYER GUESSES:\n"
                f"{guesses_json}\n\n"
                "Score each guess on this scale:\n"
                "- 100: Exact match (the guess precisely describes the main subject)\n"
                "- 75: Partial match (correct subject but missing key details)\n"
                "- 50: Category match (right general category but wrong specific item)\n"
                "- 25: Attribute only (mentions a visible attribute but wrong subject)\n"
                "- 0: Completely wrong\n\n"
                "Respond ONLY with valid JSON:\n"
                '{"image_description": "brief description of image", '
                '"results": [{"player": "address_hex", "score": 75, '
                '"explanation": "brief reason"}]}'
            )

            result = gl.nondet.exec_prompt(
                prompt, images=[screenshot], response_format="json"
            )
            return json.dumps(result, sort_keys=True)

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                # Leader errored - check if we also error
                try:
                    leader_fn()
                    return False  # We succeeded but leader failed
                except Exception:
                    return True  # Both failed - agree

            leader_data = json.loads(leaders_res.calldata)
            validator_data = json.loads(leader_fn())

            # Compare scores with +/-25 tolerance
            leader_scores = {}
            for r in leader_data.get("results", []):
                leader_scores[r["player"]] = int(r["score"])

            validator_scores = {}
            for r in validator_data.get("results", []):
                validator_scores[r["player"]] = int(r["score"])

            for player_addr in leader_scores:
                if player_addr not in validator_scores:
                    return False
                diff = abs(leader_scores[player_addr] - validator_scores[player_addr])
                if diff > 25:
                    return False

            return True

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    # ------------------------------------------------------------------ #
    #  WRITE METHODS
    # ------------------------------------------------------------------ #

    @gl.public.write
    def create_room(
        self,
        name: str,
        max_players: int,
        num_teams: int,
        total_rounds: int,
        image_urls_json: str,
    ) -> str:
        if not name.strip():
            raise gl.vm.UserError("Room name cannot be empty")
        if max_players < 2 or max_players > 20:
            raise gl.vm.UserError("Max players must be between 2 and 20")
        if num_teams < 0 or num_teams > 10:
            raise gl.vm.UserError("Number of teams must be between 0 and 10")
        if total_rounds < 1 or total_rounds > 20:
            raise gl.vm.UserError("Total rounds must be between 1 and 20")

        image_urls = json.loads(image_urls_json)
        if len(image_urls) != total_rounds:
            raise gl.vm.UserError("Must provide exactly one image URL per round")

        self.room_counter += 1
        room_id = str(self.room_counter)

        room = Room(
            id=room_id,
            host=gl.message.sender_address,
            name=name,
            max_players=u32(max_players),
            num_teams=u32(num_teams),
            total_rounds=u32(total_rounds),
            current_round=u32(0),
            is_active=False,
            is_complete=False,
        )
        self.rooms[room_id] = room

        # Initialize room membership
        self.room_players.get_or_insert_default(room_id)

        # Store image URLs for each round
        self.room_images.get_or_insert_default(room_id)
        for i, url in enumerate(image_urls):
            self.room_images[room_id][str(i + 1)] = url

        # Create preset teams if team mode
        if num_teams > 0:
            self.room_teams.get_or_insert_default(room_id)
            self.player_teams.get_or_insert_default(room_id)
            for t in range(1, num_teams + 1):
                team_id = str(t)
                self.room_teams[room_id][team_id] = Team(
                    name=f"Team {t}",
                    total_xp=u256(0),
                )

        # Host auto-joins the room
        host_addr = gl.message.sender_address.as_hex
        self.room_players[room_id][host_addr] = "Host"
        if host_addr not in self.players:
            self.players[host_addr] = Player(
                username="Host", xp=u256(0), games_played=u32(0)
            )

        return room_id

    @gl.public.write
    def join_room(self, room_id: str, username: str, team_id: str) -> None:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]

        if room.is_active:
            raise gl.vm.UserError("Game already in progress")
        if room.is_complete:
            raise gl.vm.UserError("Game already completed")
        if not username.strip():
            raise gl.vm.UserError("Username cannot be empty")

        addr = gl.message.sender_address.as_hex

        if addr in self.room_players[room_id]:
            raise gl.vm.UserError("Already in this room")

        # Check capacity
        player_count = 0
        for _ in self.room_players[room_id].items():
            player_count += 1
        if player_count >= int(room.max_players):
            raise gl.vm.UserError("Room is full")

        # Register player globally if new
        if addr not in self.players:
            self.players[addr] = Player(
                username=username, xp=u256(0), games_played=u32(0)
            )

        # Add to room
        self.room_players[room_id][addr] = username

        # Assign team if team mode
        if int(room.num_teams) > 0:
            if not team_id.strip():
                raise gl.vm.UserError("Must select a team in team mode")
            if team_id not in self.room_teams[room_id]:
                raise gl.vm.UserError("Invalid team ID")
            self.player_teams[room_id][addr] = team_id

    @gl.public.write
    def start_game(self, room_id: str) -> None:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]

        if gl.message.sender_address != room.host:
            raise gl.vm.UserError("Only the host can start the game")
        if room.is_active:
            raise gl.vm.UserError("Game already started")
        if room.is_complete:
            raise gl.vm.UserError("Game already completed")

        player_count = 0
        for _ in self.room_players[room_id].items():
            player_count += 1
        if player_count < 2:
            raise gl.vm.UserError("Need at least 2 players to start")

        room.current_round = u32(1)
        room.is_active = True
        self.rooms[room_id] = room

        # Initialize guesses for round 1
        round_key = f"{room_id}_1"
        self.round_guesses.get_or_insert_default(round_key)

    @gl.public.write
    def submit_guess(self, room_id: str, guess_text: str) -> None:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]

        if not room.is_active:
            raise gl.vm.UserError("Game not active")
        if room.is_complete:
            raise gl.vm.UserError("Game already completed")
        if not guess_text.strip():
            raise gl.vm.UserError("Guess cannot be empty")
        if len(guess_text) > 100:
            raise gl.vm.UserError("Guess too long (max 100 characters)")

        addr = gl.message.sender_address.as_hex

        if addr not in self.room_players[room_id]:
            raise gl.vm.UserError("You are not in this room")

        round_key = f"{room_id}_{room.current_round}"

        if addr in self.round_guesses[round_key]:
            raise gl.vm.UserError("Already submitted a guess this round")

        self.round_guesses[round_key][addr] = Guess(
            guess_text=guess_text,
            xp_awarded=u32(0),
            explanation="",
        )

    @gl.public.write
    def evaluate_round(self, room_id: str) -> None:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]

        if gl.message.sender_address != room.host:
            raise gl.vm.UserError("Only the host can evaluate")
        if not room.is_active:
            raise gl.vm.UserError("Game not active")
        if room.is_complete:
            raise gl.vm.UserError("Game already completed")

        # Run AI evaluation
        result_json = self._evaluate_guesses_ai(room_id)
        results = json.loads(result_json)

        round_key = f"{room_id}_{room.current_round}"

        # Apply scores
        for entry in results.get("results", []):
            addr = str(entry["player"])
            score = int(entry["score"])
            explanation = str(entry.get("explanation", ""))

            # Clamp score to valid range
            if score < 0:
                score = 0
            if score > 100:
                score = 100

            # Update the guess record with score
            if addr in self.round_guesses[round_key]:
                old_guess = self.round_guesses[round_key][addr]
                self.round_guesses[round_key][addr] = Guess(
                    guess_text=old_guess.guess_text,
                    xp_awarded=u32(score),
                    explanation=explanation,
                )

            # Update player global XP
            if addr in self.players:
                player = self.players[addr]
                player.xp += u256(score)
                player.games_played += 1
                self.players[addr] = player

            # Update team XP if team mode
            if int(room.num_teams) > 0:
                if room_id in self.player_teams:
                    if addr in self.player_teams[room_id]:
                        tid = self.player_teams[room_id][addr]
                        team = self.room_teams[room_id][tid]
                        team.total_xp += u256(score)
                        self.room_teams[room_id][tid] = team

        # Advance round or end game
        next_round = int(room.current_round) + 1
        if next_round > int(room.total_rounds):
            # Final round - game over
            room.is_active = False
            room.is_complete = True
            self.rooms[room_id] = room
        else:
            # Advance to next round
            room.current_round = u32(next_round)
            self.rooms[room_id] = room
            # Initialize guesses for next round
            next_key = f"{room_id}_{next_round}"
            self.round_guesses.get_or_insert_default(next_key)

    # ------------------------------------------------------------------ #
    #  VIEW METHODS
    # ------------------------------------------------------------------ #

    @gl.public.view
    def get_rooms(self) -> dict:
        result = {}
        for room_id, room in self.rooms.items():
            player_count = 0
            for _ in self.room_players[room_id].items():
                player_count += 1
            result[room_id] = {
                "id": room.id,
                "host": room.host.as_hex,
                "name": room.name,
                "max_players": int(room.max_players),
                "num_teams": int(room.num_teams),
                "total_rounds": int(room.total_rounds),
                "current_round": int(room.current_round),
                "is_active": room.is_active,
                "is_complete": room.is_complete,
                "player_count": player_count,
            }
        return result

    @gl.public.view
    def get_room(self, room_id: str) -> dict:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]
        player_count = 0
        for _ in self.room_players[room_id].items():
            player_count += 1

        return {
            "id": room.id,
            "host": room.host.as_hex,
            "name": room.name,
            "max_players": int(room.max_players),
            "num_teams": int(room.num_teams),
            "total_rounds": int(room.total_rounds),
            "current_round": int(room.current_round),
            "is_active": room.is_active,
            "is_complete": room.is_complete,
            "player_count": player_count,
        }

    @gl.public.view
    def get_room_players(self, room_id: str) -> dict:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        result = {}
        for addr, username in self.room_players[room_id].items():
            entry = {"username": username}
            room = self.rooms[room_id]
            if int(room.num_teams) > 0:
                if room_id in self.player_teams:
                    if addr in self.player_teams[room_id]:
                        entry["team_id"] = self.player_teams[room_id][addr]
            result[addr] = entry
        return result

    @gl.public.view
    def get_current_image(self, room_id: str) -> str:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]
        if int(room.current_round) == 0:
            return ""

        round_str = str(room.current_round)
        if room_id in self.room_images:
            if round_str in self.room_images[room_id]:
                return self.room_images[room_id][round_str]
        return ""

    @gl.public.view
    def get_round_results(self, room_id: str, round_num: int) -> dict:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        round_key = f"{room_id}_{round_num}"
        result = {}

        if round_key in self.round_guesses:
            for addr, guess in self.round_guesses[round_key].items():
                result[addr] = {
                    "guess_text": guess.guess_text,
                    "xp_awarded": int(guess.xp_awarded),
                    "explanation": guess.explanation,
                }
        return result

    @gl.public.view
    def get_leaderboard(self, room_id: str) -> dict:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]
        leaderboard = {}

        for addr, username in self.room_players[room_id].items():
            room_xp = 0
            for r in range(1, int(room.current_round) + 1):
                rk = f"{room_id}_{r}"
                if rk in self.round_guesses:
                    if addr in self.round_guesses[rk]:
                        room_xp += int(self.round_guesses[rk][addr].xp_awarded)

            entry = {
                "username": username,
                "room_xp": room_xp,
                "global_xp": int(self.players[addr].xp) if addr in self.players else 0,
            }

            if int(room.num_teams) > 0:
                if room_id in self.player_teams:
                    if addr in self.player_teams[room_id]:
                        entry["team_id"] = self.player_teams[room_id][addr]

            leaderboard[addr] = entry

        return leaderboard

    @gl.public.view
    def get_global_leaderboard(self) -> dict:
        result = {}
        for addr, player in self.players.items():
            result[addr] = {
                "username": player.username,
                "xp": int(player.xp),
                "games_played": int(player.games_played),
            }
        return result

    @gl.public.view
    def get_player(self, address: str) -> dict:
        if address not in self.players:
            raise gl.vm.UserError("Player not found")

        player = self.players[address]
        return {
            "username": player.username,
            "xp": int(player.xp),
            "games_played": int(player.games_played),
        }

    @gl.public.view
    def get_teams(self, room_id: str) -> dict:
        if room_id not in self.rooms:
            raise gl.vm.UserError("Room not found")

        room = self.rooms[room_id]
        if int(room.num_teams) == 0:
            return {}

        result = {}
        if room_id in self.room_teams:
            for team_id, team in self.room_teams[room_id].items():
                member_count = 0
                members = []
                if room_id in self.player_teams:
                    for addr, tid in self.player_teams[room_id].items():
                        if tid == team_id:
                            member_count += 1
                            members.append(addr)

                result[team_id] = {
                    "name": team.name,
                    "total_xp": int(team.total_xp),
                    "member_count": member_count,
                    "members": members,
                }
        return result

