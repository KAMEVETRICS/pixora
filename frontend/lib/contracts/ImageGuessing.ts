import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  Room,
  Player,
  Leaderboard,
  RoundResult,
  RoomPlayer,
  TeamInfo,
  TransactionReceipt,
} from "./types";

/**
 * ImageGuessing contract wrapper.
 * All methods use real readContract / writeContract calls via genlayer-js.
 */
class ImageGuessingContract {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    if (studioUrl) config.endpoint = studioUrl;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    this.client = createClient({
      chain: studionet,
      account: address as `0x${string}`,
    });
  }

  // ------------------------------------------------------------------ //
  //  READ METHODS
  // ------------------------------------------------------------------ //

  async getRooms(): Promise<Room[]> {
    try {
      const rooms: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_rooms",
        args: [],
      });
      return this.mapToRoomArray(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      throw new Error("Failed to fetch rooms");
    }
  }

  async getRoom(roomId: string): Promise<Room> {
    try {
      const room: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_room",
        args: [roomId],
      });
      return this.parseRoom(room);
    } catch (error) {
      console.error("Error fetching room:", error);
      throw new Error("Failed to fetch room");
    }
  }

  async getRoomPlayers(
    roomId: string
  ): Promise<Record<string, RoomPlayer>> {
    try {
      const players: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_room_players",
        args: [roomId],
      });
      return this.mapToObject(players);
    } catch (error) {
      console.error("Error fetching room players:", error);
      throw new Error("Failed to fetch room players");
    }
  }

  async getCurrentImage(roomId: string): Promise<string> {
    try {
      const url = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_current_image",
        args: [roomId],
      });
      return String(url || "");
    } catch (error) {
      console.error("Error fetching current image:", error);
      return "";
    }
  }

  async getRoundResults(
    roomId: string,
    roundNum: number
  ): Promise<RoundResult> {
    try {
      const results: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_round_results",
        args: [roomId, roundNum],
      });
      return this.mapToObject(results);
    } catch (error) {
      console.error("Error fetching round results:", error);
      throw new Error("Failed to fetch round results");
    }
  }

  async getLeaderboard(roomId: string): Promise<Leaderboard> {
    try {
      const lb: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_leaderboard",
        args: [roomId],
      });
      return this.mapToObject(lb);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      throw new Error("Failed to fetch leaderboard");
    }
  }

  async getGlobalLeaderboard(): Promise<Record<string, Player>> {
    try {
      const lb: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_global_leaderboard",
        args: [],
      });
      return this.mapToObject(lb);
    } catch (error) {
      console.error("Error fetching global leaderboard:", error);
      throw new Error("Failed to fetch global leaderboard");
    }
  }

  async getPlayer(address: string): Promise<Player> {
    try {
      const player: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_player",
        args: [address],
      });
      return this.mapToObject(player) as Player;
    } catch (error) {
      console.error("Error fetching player:", error);
      throw new Error("Failed to fetch player");
    }
  }

  async getTeams(roomId: string): Promise<Record<string, TeamInfo>> {
    try {
      const teams: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_teams",
        args: [roomId],
      });
      return this.mapToObject(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw new Error("Failed to fetch teams");
    }
  }

  // ------------------------------------------------------------------ //
  //  WRITE METHODS
  // ------------------------------------------------------------------ //

  async createRoom(
    name: string,
    maxPlayers: number,
    numTeams: number,
    totalRounds: number,
    imageUrls: string[]
  ): Promise<TransactionReceipt> {
    try {
      const imageUrlsJson = JSON.stringify(imageUrls);

      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "create_room",
        args: [name, maxPlayers, numTeams, totalRounds, imageUrlsJson],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error creating room:", error);
      throw new Error("Failed to create room");
    }
  }

  async joinRoom(
    roomId: string,
    username: string,
    teamId: string = ""
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "join_room",
        args: [roomId, username, teamId],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error joining room:", error);
      throw new Error("Failed to join room");
    }
  }

  async startGame(roomId: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "start_game",
        args: [roomId],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error starting game:", error);
      throw new Error("Failed to start game");
    }
  }

  async submitGuess(
    roomId: string,
    guessText: string
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "submit_guess",
        args: [roomId, guessText],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error submitting guess:", error);
      throw new Error("Failed to submit guess");
    }
  }

  async evaluateRound(roomId: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "evaluate_round",
        args: [roomId],
        value: BigInt(0),
      });

      // Evaluation can take longer due to AI processing
      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 60,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error evaluating round:", error);
      throw new Error("Failed to evaluate round");
    }
  }


  // ------------------------------------------------------------------ //
  //  HELPERS
  // ------------------------------------------------------------------ //

  private mapToRoomArray(data: any): Room[] {
    if (data instanceof Map) {
      return Array.from(data.entries()).map(([id, d]: any) => ({
        id,
        ...this.mapToObject(d),
      })) as Room[];
    }
    if (typeof data === "object" && data !== null) {
      return Object.entries(data).map(([id, d]: any) => ({
        id,
        ...(d instanceof Map ? this.mapToObject(d) : d),
      })) as Room[];
    }
    return [];
  }

  private parseRoom(data: any): Room {
    return (data instanceof Map ? this.mapToObject(data) : data) as Room;
  }

  private mapToObject(map: any): Record<string, any> {
    if (!(map instanceof Map)) return map;
    const obj: Record<string, any> = {};
    for (const [key, value] of map.entries()) {
      if (value instanceof Map) {
        obj[key] = this.mapToObject(value);
      } else if (Array.isArray(value)) {
        obj[key] = value.map((item) =>
          item instanceof Map ? this.mapToObject(item) : item
        );
      } else {
        obj[key] = value;
      }
    }
    return obj;
  }
}

export default ImageGuessingContract;
