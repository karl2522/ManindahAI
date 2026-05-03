# ManindaHAI Hackathon Guidelines (AGENTS.md)

This document defines strict coding, database, and workflow standards for all developers to ensure consistency, speed, and production-quality output during the hackathon.  
This is the **single source of truth** for all development decisions.

---

## 🧭 DECISION PRIORITY ORDER

When rules conflict, follow this order strictly:

1. Correctness  
2. Data Integrity  
3. System Consistency  
4. Performance  
5. Simplicity  

---

## 🚀 CORE PRINCIPLES

### 1. Consistency First
- All developers MUST follow the same patterns across frontend, backend, and database.
- Similar features MUST follow identical structure unless explicitly agreed.

### 2. Simplicity Over Perfection
- Prefer simple, working solutions over complex architectures.
- Do NOT introduce unnecessary abstractions.

### 3. Fast but Safe
- Move fast, but NEVER break database integrity.
- Avoid risky changes without validation.

---

## 🧱 CODING STANDARDS

### 1. General Rules
- Code MUST be readable, minimal, and consistent.
- Avoid deeply nested logic.
- Reuse existing patterns before creating new ones.

---

### 2. Type Safety
- Use strict TypeScript typing.
- Avoid `any` unless absolutely necessary.

---

### 3. Project Structure

**Mobile (React Native)**
```
/*           # React Native application
/android/*   # Android native code
/ios/*       # iOS native code
```

**Database (Supabase)**
```
/supabase/migrations/* # SQL migration files
```

- Business logic MUST NOT exist inside UI components.


---

### 4. Supabase Usage

- All database access MUST go through a centralized client (`/lib/supabase.ts`)
- Queries MUST be reusable (no duplication across files)
- Keep DB logic inside `/services`

---

## 🗄️ DATABASE & MIGRATIONS (SUPABASE)

### 1. Migration Requirement
- All schema changes MUST be done through migration files.
- Manual DB edits are NOT allowed.

---

### 2. Migration Naming Convention (STRICT)

- Format: `YYYYMMDDHHMMSS_feature_description`
- Examples: 
  - `20260503123000_create_users_table`
  - `20260503124500_add_profile_fields`
  - `20260503130000_create_posts_table`

Rules:
- MUST be chronological
- MUST be descriptive
- MUST use snake_case
- MUST NOT be vague

---

### 3. Migration Execution (CRITICAL)

- ALWAYS use MCP when running migrations
- NEVER run migrations manually outside MCP

Workflow:
1. Create migration file  
2. Review SQL  
3. Run migration via MCP  
4. Verify schema  

---

### 4. Migration Safety

- Use `IF NOT EXISTS` when possible
- Avoid destructive changes (DROP)
- Never modify old migrations
- Always create new migrations

---

## 🔒 DATA INTEGRITY

- Multi-step operations MUST be atomic
- Avoid partial writes
- Use transactions when needed

---

## ⚡ PERFORMANCE RULES

- Avoid repeated queries
- Fetch only required fields
- Paginate large datasets
- Do NOT over-optimize prematurely

---

## 🚨 ERROR HANDLING

- Never expose raw errors to users
- Handle async errors properly
- Log errors clearly

---

## 🧠 SYSTEM CONSISTENCY RULES

### Naming Conventions

**Files**
- snake_case → backend/services
- PascalCase → React components

**Variables**
- camelCase

**Database**
- snake_case (tables, columns, keys)

---
## 🚩 FAILURE HANDLING

- If unsure → ASK  
- If schema unclear → CHECK DB  
- If logic exists → REUSE  

---

## ⚖️ ANTI-OVERENGINEERING

- No microservices  
- No unnecessary abstraction layers  
- No premature optimization  
- No new frameworks  

## 🏗️ GIT WORKFLOW RULES

### 1. Branching Strategy

- A new branch MUST be created for every feature, fix, or task  
- Branches MUST always come from the latest `dev` branch  
- Before creating a branch, you MUST update `dev`:
```bash
# Switch to dev branch
git checkout dev

# Pull latest changes from remote
git pull origin dev

# Create feature branch
git checkout -b feature/new-feature-name
```

---

### 2. Development Flow

1. Update `dev`
2. Create new branch from `dev`
3. Implement feature
4. Test locally
5. Commit changes
6. Push branch
7. Create PR → `dev`

---

### 3. Commit Rules

- Commits MUST be atomic (one logical change only)
- Use clear and descriptive messages

Format:
```
feat: add user authentication

- Implemented email/password login
- Added JWT token generation
- Created user profile table
```

---

### 4. Pull Request (PR) Rules

- PRs MUST be created for every branch
- PRs MUST target the `dev` branch
- PRs MUST have a clear description
- Code review is mandatory before merging

---

### 5. Merge Strategy

- ONLY merge AFTER:
  1. All tests pass
  2. Code review complete
  3. No conflicts
  4. All rules followed

---

### 6. Notes
- Don't run directly git commands without the user's permission, always ask for permission when running git commands.

---

## 🤖 AI USAGE (OPTIONAL)

- Keep prompts simple and deterministic  
- Avoid multi-step AI flows unless necessary  
- Do NOT rely on AI for critical logic  

### API Response Format

All responses MUST follow:

```ts
{
  success: boolean;
  data?: any;
  error?: string;
}

---
