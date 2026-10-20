# Behav Security & Data Isolation Specification

## 1. Multi-User Isolation Guarantees

Data isolation is a mandatory security requirement across both local and remote storage tiers:

1. **Authentication Context Enforcement**:
   - The authenticated identity is derived strictly from the verified JWT access token or session cookie.
   - The server never trusts client-supplied `userId` parameters as proof of ownership.
   - Any query attempting to access or modify another user's behaviors, entries, goals, or reviews is rejected with `404 Not Found` or `403 Forbidden`.

2. **Parent-Child Ownership Verification**:
   - Creating an entry requires verifying that the referenced `behaviorId` is genuinely owned by the authenticated caller.
   - Cross-user resource association is prevented at both the application and database constraint levels.

3. **Local SQLite Partitioning**:
   - SQLite tables enforce user-scoped indices (`idx_behaviors_user`, `idx_entries_user_occurred`, `idx_goals_user_behavior`).
   - Every SQLite repository query explicitly includes `WHERE user_id = ?`.
   - On account switching, cached state is purged and re-queried for the new active account.

---

## 2. Cryptographic Implementations

### Password Hashing
- Algorithm: Node.js `crypto.scrypt`
- Cost parameter ($N$): 16384
- Block size ($r$): 8
- Parallelism ($p$): 1
- Salt: 16 bytes of cryptographically secure random bytes
- Key length: 64 bytes
- Verification: `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

### Token & Session Lifecycle
- Short-lived JWT Access Tokens (15-minute expiration) signed with HMAC SHA-256.
- 32-byte cryptographically secure refresh tokens stored in hashed form (`SHA-256`) in the database.
- Refresh Token Rotation: Every refresh request invalidates the previous session and issues a new refresh token.
- Immediate session revocation upon logout or password reset.
