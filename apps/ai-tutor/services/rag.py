"""
Retrieval-Augmented Generation (RAG) knowledge engine for StellarLearn AI Tutor.
"""

from typing import Optional

KNOWLEDGE_BASE = [
    {
        "id": "scp-consensus",
        "tags": ["consensus", "scp", "federated", "byzantine", "fast", "finality"],
        "title": "Stellar Consensus Protocol (SCP)",
        "snippet": "SCP uses Federated Byzantine Agreement (FBA) allowing decentralized consensus without proof-of-work. Transactions reach finality in 3-5 seconds with high throughput and deterministic settlement.",
    },
    {
        "id": "accounts-and-stroops",
        "tags": ["account", "key", "ed25519", "stroop", "stroops", "fee", "balance", "wallet"],
        "title": "Accounts, Keys and Stroops",
        "snippet": "Stellar accounts are Ed25519 public keys starting with 'G'. The smallest unit of XLM is 1 stroop (0.0000001 XLM). Base network fee is 100 stroops per operation.",
    },
    {
        "id": "soroban-contracts",
        "tags": ["soroban", "rust", "wasm", "contract", "env", "storage", "smart contract", "sdk"],
        "title": "Soroban Smart Contracts",
        "snippet": "Soroban contracts are written in Rust, compiled to WASM, and executed inside a deterministic sandboxed runtime. Contracts utilize instance, persistent, and temporary state storage tiers.",
    },
    {
        "id": "defi-liquidity-pools",
        "tags": ["defi", "amm", "liquidity", "pool", "path payment", "swap", "asset"],
        "title": "AMM Pools & Path Payments",
        "snippet": "Stellar features native AMM constant-product liquidity pools (0.3% fee) and Path Payments that atomically find optimal swap routes across multiple order books and pools in a single transaction.",
    },
    {
        "id": "credentials-rewards",
        "tags": ["credential", "nft", "reward", "token", "learn", "certificate", "ipfs", "cid"],
        "title": "Verifiable Credentials & LEARN Rewards",
        "snippet": "StellarLearn course completions automatically trigger CredentialContract to mint verifiable NFTs with IPFS CIDs and RewardContract to disburse LEARN tokens to learner wallets.",
    },
]


def retrieve_relevant_knowledge(query: str, course_context: str = "") -> Optional[dict]:
    """Retrieve the most relevant knowledge snippet based on keyword frequency."""
    query_lower = f"{query} {course_context}".lower()
    best_doc = None
    best_score = 0

    for doc in KNOWLEDGE_BASE:
        score = 0
        for tag in doc["tags"]:
            if tag in query_lower:
                score += 2
        for word in doc["title"].lower().split():
            if word in query_lower:
                score += 1
        if score > best_score:
            best_score = score
            best_doc = doc

    return best_doc or KNOWLEDGE_BASE[0]
