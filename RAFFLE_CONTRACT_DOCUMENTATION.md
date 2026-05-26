# GenLayer Raffle Contract Documentation

This document explains how the GenLayer Raffle intelligent contract works, including its integration with the frontend application.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Smart Contract Deep Dive](#smart-contract-deep-dive)
4. [Data Structures](#data-structures)
5. [Contract Methods](#contract-methods)
6. [AI-Powered Winner Selection](#ai-powered-winner-selection)
7. [Frontend Integration](#frontend-integration)
8. [User Flows](#user-flows)
9. [Security & Validation](#security--validation)

---

## Overview

The GenLayer Raffle is an **AI-native decentralized raffle system** built on the GenLayer blockchain. Unlike traditional random-based raffles, this system uses Large Language Models (LLMs) to select winners based on how well their entry reasons match the raffle's theme/purpose.

### Key Features

- **Theme-based selection**: Winners are chosen by AI based on relevance to raffle purpose
- **Transparent fairness**: Uses GenLayer's Equivalence Principle for consensus
- **Global username registry**: Ensures unique identities across all raffles
- **Privacy protection**: Participant reasons are hidden until raffle resolution
- **Creator control**: Only raffle creators can trigger winner selection

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Components                    │  Hooks (TanStack Query)            │
│  ├── RaffleList.tsx           │  ├── useRaffles()                  │
│  ├── RaffleCard.tsx           │  ├── useCreateRaffle()             │
│  ├── RaffleDetail.tsx         │  ├── useEnterRaffle()              │
│  ├── CreateRaffleModal.tsx    │  ├── useSelectWinners()            │
│  └── EnterRaffleModal.tsx     │  └── useCheckUsername()            │
├─────────────────────────────────────────────────────────────────────┤
│                    RaffleContract.ts (GenLayerJS)                   │
│         readContract() / writeContract() → GenLayer RPC             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GENLAYER BLOCKCHAIN (GenVM)                       │
├─────────────────────────────────────────────────────────────────────┤
│  contracts/raffle.py                                                 │
│  ├── Storage: TreeMap[str, Raffle], TreeMap[str, Participant]       │
│  ├── LLM Integration: gl.nondet.exec_prompt()                       │
│  └── Consensus: gl.eq_principle.strict_eq()                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Deep Dive

The contract (`contracts/raffle.py`) is a Python-based GenLayer Intelligent Contract that inherits from `gl.Contract`.

### Storage Schema

```python
class RaffleContract(gl.Contract):
    raffles: TreeMap[str, Raffle]                              # All raffles by ID
    participants: TreeMap[str, TreeMap[str, Participant]]      # raffle_id → (username → Participant)
    winners: TreeMap[str, TreeMap[str, str]]                   # raffle_id → (index → username)
    username_registry: TreeMap[str, str]                       # username → raffle_id (global)
    raffle_counter: u256                                       # Auto-incrementing ID
```

---

## Data Structures

### Raffle

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique raffle identifier |
| `creator` | `Address` | Wallet address of raffle creator |
| `reason` | `str` | Theme/purpose of the raffle (used for AI selection) |
| `prize` | `str` | Description of what winners receive |
| `num_winners` | `u32` | Maximum number of winners |
| `created_at` | `str` | ISO timestamp of creation |
| `end_date` | `str` | ISO timestamp when raffle ends |
| `is_resolved` | `bool` | Whether winners have been selected |

### Participant

| Field | Type | Description |
|-------|------|-------------|
| `username` | `str` | Unique username for the participant |
| `reason` | `str` | Why they want to win (used for AI selection) |
| `entry_timestamp` | `str` | ISO timestamp of entry |
| `is_winner` | `bool` | Whether this participant won |

---

## Contract Methods

### Write Methods (State-changing)

#### `create_raffle(reason, prize, num_winners, created_at, end_date) → str`

Creates a new raffle and returns its ID.

```python
@gl.public.write
def create_raffle(self, reason: str, prize: str, num_winners: int,
                  created_at: str, end_date: str) -> str:
```

**Validations:**
- `num_winners` must be ≥ 1
- `reason`, `prize`, and `end_date` cannot be empty

**Process:**
1. Increments `raffle_counter`
2. Creates `Raffle` object with `gl.message.sender_address` as creator
3. Stores in `raffles` TreeMap
4. Initializes empty participant and winner maps for this raffle

---

#### `enter_raffle(raffle_id, username, reason, entry_timestamp)`

Allows a user to enter an existing raffle.

```python
@gl.public.write
def enter_raffle(self, raffle_id: str, username: str,
                 reason: str, entry_timestamp: str) -> None:
```

**Validations:**
- Raffle must exist
- Raffle must not be resolved
- Username cannot be empty
- Reason cannot be empty
- **Username must be globally unique** (checked against `username_registry`)

**Process:**
1. Creates `Participant` object
2. Stores in `participants[raffle_id][username]`
3. Registers username in global `username_registry`

---

#### `select_winners(raffle_id)`

Triggers AI-powered winner selection. **Creator only.**

```python
@gl.public.write
def select_winners(self, raffle_id: str) -> None:
```

**Validations:**
- Raffle must exist
- Caller must be the raffle creator (`gl.message.sender_address == raffle.creator`)
- Raffle must not already be resolved
- Must have at least 1 participant

**Process:**
1. Calls `_select_winners_with_llm(raffle_id)`
2. Marks winning participants (`is_winner = True`)
3. Stores winners in `winners` TreeMap
4. Sets `raffle.is_resolved = True`

---

### View Methods (Read-only)

| Method | Returns | Description |
|--------|---------|-------------|
| `get_all_raffles()` | `dict` | All raffles with their details and winners |
| `get_raffle(raffle_id)` | `dict` | Single raffle details |
| `get_participants(raffle_id)` | `dict` | All participants (reasons hidden until resolved) |
| `get_winners(raffle_id)` | `list` | List of winning usernames |
| `is_username_taken(username)` | `bool` | Check global username availability |
| `get_participant_count(raffle_id)` | `int` | Number of participants in raffle |

**Privacy Feature:** `get_participants()` returns `"[Hidden until resolved]"` for participant reasons until the raffle is resolved, preventing gaming of the system.

---

## AI-Powered Winner Selection

The core innovation of this raffle is the `_select_winners_with_llm()` method:

```python
def _select_winners_with_llm(self, raffle_id: str) -> list:
    # 1. Build participant list with reasons
    participant_list = []
    for username, participant in participants_map.items():
        participant_list.append({
            "username": username,
            "reason": participant.reason
        })

    # 2. Create LLM prompt
    def get_winners() -> str:
        prompt = f"""You are a fair raffle judge. Select {num_winners} winner(s)...

        RAFFLE PURPOSE/THEME: {raffle_reason}
        PARTICIPANTS: {json.dumps(participant_list)}

        SELECTION CRITERIA:
        1. Choose participants whose reasons best match the raffle's purpose
        2. Consider creativity, relevance, and sincerity
        3. If reasons are equally good, use your judgment

        Respond in JSON: {{"winners": ["username1", ...]}}"""

        result = gl.nondet.exec_prompt(prompt, response_format="json")
        return json.dumps(result, sort_keys=True)

    # 3. Apply Equivalence Principle for consensus
    result_json = json.loads(gl.eq_principle.strict_eq(get_winners))
    return result_json["winners"]
```

### How It Works

1. **Prompt Construction**: The LLM receives the raffle theme and all participant reasons
2. **Non-deterministic Execution**: `gl.nondet.exec_prompt()` runs the prompt on GenLayer's LLM infrastructure
3. **Consensus via Equivalence Principle**: `gl.eq_principle.strict_eq()` ensures all validators agree on the same winners
4. **JSON Response**: Winners are returned as a JSON array of usernames

### Selection Criteria

The AI evaluates:
- **Relevance**: How well the reason matches the raffle theme
- **Creativity**: Unique and thoughtful responses
- **Sincerity**: Genuine enthusiasm and authenticity

---

## Frontend Integration

### Contract Wrapper (`lib/contracts/Raffle.ts`)

The `RaffleContract` class wraps GenLayerJS client calls:

```typescript
class RaffleContract {
  private client: ReturnType<typeof createClient>;

  async createRaffle(reason, prize, numWinners, endDate): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "create_raffle",
      args: [reason, prize, numWinners, createdAt, endDate],
    });
    return await this.client.waitForTransactionReceipt({ hash: txHash });
  }

  async selectWinners(raffleId): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      functionName: "select_winners",
      args: [raffleId],
    });
    return await this.client.waitForTransactionReceipt({ hash: txHash });
  }
}
```

### React Hooks (`lib/hooks/useRaffle.ts`)

TanStack Query hooks manage data fetching and mutations:

```typescript
// Fetch all raffles with auto-refresh
export function useRaffles() {
  return useQuery({
    queryKey: ["raffles"],
    queryFn: () => contract.getAllRaffles(),
    refetchOnWindowFocus: true,
  });
}

// Create raffle mutation with cache invalidation
export function useCreateRaffle() {
  return useMutation({
    mutationFn: (params) => contract.createRaffle(...),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raffles"] });
    },
  });
}
```

### Key UI Components

| Component | Purpose |
|-----------|---------|
| `RaffleList.tsx` | Displays grid of raffle cards with filtering |
| `RaffleCard.tsx` | Shows raffle summary, stats, actions |
| `RaffleDetail.tsx` | Modal with full raffle info and participants |
| `CreateRaffleModal.tsx` | Form for creating new raffles |
| `EnterRaffleModal.tsx` | Form for entering a raffle with username check |

---

## User Flows

### Flow 1: Creating a Raffle

```
User clicks "Create Raffle" → Opens CreateRaffleModal
    ↓
User fills form:
  - Theme/Purpose (what the raffle is about)
  - Prize (what winner(s) receive)
  - Number of winners
  - End date
    ↓
Submit → useCreateRaffle().createRaffle()
    ↓
RaffleContract.createRaffle() → GenLayer writeContract
    ↓
Transaction confirmed → Query cache invalidated
    ↓
New raffle appears in RaffleList
```

### Flow 2: Entering a Raffle

```
User clicks "Enter Raffle" on a RaffleCard → Opens EnterRaffleModal
    ↓
User enters:
  - Unique username (checked real-time via is_username_taken)
  - Reason for wanting to win (strategy: match the raffle theme!)
    ↓
Submit → useEnterRaffle().enterRaffle()
    ↓
RaffleContract.enterRaffle() → GenLayer writeContract
    ↓
Transaction confirmed → Participant added
    ↓
User sees confirmation, participant count updates
```

### Flow 3: Selecting Winners (Creator Only)

```
Creator clicks "Select Winners" on their raffle
    ↓
Confirmation dialog: "AI will choose winners based on reasons..."
    ↓
useSelectWinners().selectWinners(raffleId)
    ↓
Contract calls _select_winners_with_llm():
  1. Gathers all participants and reasons
  2. Sends to LLM with selection criteria
  3. LLM evaluates relevance to theme
  4. Returns winner usernames
  5. Equivalence Principle ensures consensus
    ↓
Winners marked, raffle resolved
    ↓
UI updates: Winners displayed, participant reasons now visible
```

---

## Security & Validation

### Contract-Level Security

| Check | Location | Description |
|-------|----------|-------------|
| Creator-only actions | `select_winners()` | Only `raffle.creator` can select winners |
| Resolution lock | Multiple methods | Prevents double-resolution or entry after resolution |
| Input validation | All write methods | Empty strings rejected |
| Username uniqueness | `enter_raffle()` | Global registry prevents duplicate usernames |

### Frontend Validation

- **Wallet connection required** for all write operations
- **Real-time username availability** checking before submission
- **Date validation** for end dates
- **Form validation** for required fields

### Privacy Protection

- Participant reasons are **hidden until resolution** via `get_participants()`
- This prevents:
  - Copying successful-looking reasons
  - Strategic late entries based on competition analysis
  - Gaming the AI selection system

---

## Technical Notes

### GenLayer-Specific Features Used

1. **`gl.Contract`**: Base class for intelligent contracts
2. **`TreeMap`**: Persistent key-value storage
3. **`@allow_storage`**: Decorator for storable dataclasses
4. **`@gl.public.write`**: State-modifying methods
5. **`@gl.public.view`**: Read-only methods
6. **`gl.message.sender_address`**: Transaction sender's address
7. **`gl.nondet.exec_prompt()`**: LLM execution
8. **`gl.eq_principle.strict_eq()`**: Consensus validation for non-deterministic outputs

### Transaction Flow

```
Frontend                    GenLayer RPC              GenVM
   │                            │                       │
   │──writeContract()──────────►│                       │
   │                            │──Execute Contract────►│
   │                            │                       │──LLM Call
   │                            │                       │◄─────────
   │                            │◄──Transaction Hash────│
   │◄─waitForReceipt()─────────│                       │
   │                            │                       │
```

---

## Summary

The GenLayer Raffle demonstrates the power of AI-native blockchain development:

- **Intelligent Selection**: LLMs evaluate participant motivations, not random chance
- **Decentralized Consensus**: Equivalence Principle ensures fair, agreed-upon results
- **Modern DApp Stack**: Next.js + TanStack Query + GenLayerJS for seamless UX
- **Privacy by Design**: Hidden reasons until resolution prevents gaming

This pattern can be extended to any scenario where subjective evaluation is needed: grant applications, contest judging, content moderation, and more.
