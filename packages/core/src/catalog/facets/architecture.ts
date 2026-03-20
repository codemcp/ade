import type { Facet } from "../../types.js";

export const architectureFacet: Facet = {
  id: "architecture",
  label: "Architecture",
  description:
    "Stack and framework conventions that shape your project structure",
  required: false,
  multiSelect: false,
  options: [
    {
      id: "tanstack",
      label: "TanStack",
      description:
        "Full-stack conventions for TanStack (Router, Query, Form, Table)",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "tanstack-architecture",
                description:
                  "Architecture conventions for TanStack applications",
                body: [
                  "# TanStack Architecture Conventions",
                  "",
                  "## Project Structure",
                  "- Use file-based routing with TanStack Router (`routes/` directory)",
                  "- Colocate route components with their loaders and actions",
                  "- Organize by feature, not by type (e.g. `features/auth/`, not `components/auth/`)",
                  "",
                  "## Data Flow",
                  "- Use TanStack Query for all server state management",
                  "- Use TanStack Router loaders for route-level data requirements",
                  "- Keep client state minimal — prefer server state via Query",
                  "- Use `queryOptions()` factory pattern for reusable query definitions",
                  "",
                  "## Module Boundaries",
                  "- Each feature exports a public API via `index.ts`",
                  "- Features must not import from other features' internals",
                  "- Shared code goes in `lib/` or `shared/`"
                ].join("\n")
              },
              {
                name: "tanstack-design",
                description: "Design patterns for TanStack applications",
                body: [
                  "# TanStack Design Patterns",
                  "",
                  "## Query Patterns",
                  "- Define query options as standalone functions: `export const userQueryOptions = (id: string) => queryOptions({ queryKey: ['user', id], queryFn: () => fetchUser(id) })`",
                  "- Use `useSuspenseQuery` in route components paired with `loader` for prefetching",
                  "- Use `useMutation` with `onSettled` for cache invalidation",
                  "",
                  "## Router Patterns",
                  "- Define routes using `createFileRoute` for type-safe file-based routing",
                  "- Use `beforeLoad` for auth guards and redirects",
                  "- Use search params validation with `zodSearchValidator` for type-safe URL state",
                  "",
                  "## Form Patterns",
                  "- Use TanStack Form with Zod validators for form state and validation",
                  "- Prefer field-level validation over form-level where possible",
                  "- Connect form submission to `useMutation` for server sync"
                ].join("\n")
              },
              {
                name: "tanstack-code",
                description: "Code style conventions for TanStack applications",
                body: [
                  "# TanStack Code Conventions",
                  "",
                  "## TypeScript",
                  "- Enable strict mode in tsconfig",
                  "- Infer types from TanStack APIs rather than writing manual type annotations",
                  "- Use `satisfies` operator for type-safe object literals",
                  "",
                  "## Naming",
                  "- Query keys: `['entity', ...params]` (e.g. `['user', userId]`)",
                  "- Query option factories: `entityQueryOptions` (e.g. `userQueryOptions`)",
                  "- Route files: `$param` for dynamic segments (e.g. `users/$userId.tsx`)",
                  "- Loaders: export as named `loader` from route file",
                  "",
                  "## Imports",
                  "- Import from `@tanstack/react-query`, `@tanstack/react-router`, etc.",
                  "- Never import internal modules from TanStack packages",
                  "- Use path aliases for project imports (`@/features/...`)"
                ].join("\n")
              },
              {
                name: "tanstack-testing",
                description: "Testing conventions for TanStack applications",
                body: [
                  "# TanStack Testing Conventions",
                  "",
                  "## Query Testing",
                  "- Wrap components in `QueryClientProvider` with a fresh `QueryClient` per test",
                  "- Use `@testing-library/react` with `renderHook` for testing custom query hooks",
                  "- Mock at the network level with MSW, not at the query level",
                  "",
                  "## Router Testing",
                  "- Use `createMemoryHistory` and `createRouter` for route testing",
                  "- Test route loaders independently as plain async functions",
                  "- Test search param validation with unit tests on the validator schema",
                  "",
                  "## Integration Tests",
                  "- Test full user flows through route transitions",
                  "- Assert on visible UI state, not internal query cache state",
                  "- Use `waitFor` for async query resolution in component tests"
                ].join("\n")
              },
              {
                name: "playwright-cli",
                source: "microsoft/playwright-cli/skills/playwright-cli"
              }
            ]
          }
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-router-docs",
            label: "TanStack Router",
            origin: "https://github.com/TanStack/router.git",
            description: "File-based routing, loaders, and search params"
          }
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-query-docs",
            label: "TanStack Query",
            origin: "https://github.com/TanStack/query.git",
            description: "Server state management, caching, and mutations"
          }
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-form-docs",
            label: "TanStack Form",
            origin: "https://github.com/TanStack/form.git",
            description: "Type-safe form state and validation"
          }
        },
        {
          writer: "docset",
          config: {
            id: "tanstack-table-docs",
            label: "TanStack Table",
            origin: "https://github.com/TanStack/table.git",
            description: "Headless table and datagrid utilities"
          }
        }
      ]
    },
    {
      id: "nodejs-backend",
      label: "Node.js Backend",
      description: "Type-safe API server with Express 5, tRPC, and Drizzle ORM",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "nodejs-backend-architecture",
                description:
                  "Architecture conventions for Node.js backend applications",
                body: [
                  "# Node.js Backend Architecture Conventions",
                  "",
                  "## Project Structure",
                  "- Layered architecture: `routes/` → `procedures/` → `services/` → `repositories/`",
                  "- Organize by feature, not by type (e.g. `features/users/`, `features/orders/`)",
                  "- Each feature exports its tRPC router via `index.ts`",
                  "- Shared code in `lib/` (db client, logger, error classes)",
                  "- Entry point: `src/server.ts` creates Express app and mounts tRPC adapter via `express.createHandler`",
                  "",
                  "## Module Boundaries",
                  "- Features must not import from other features' internals",
                  "- Services never touch `req`/`res` — they receive typed inputs and return plain objects",
                  "- Repositories are thin wrappers around Drizzle queries",
                  "- Dependency injection via function parameters, not DI containers",
                  "",
                  "## Configuration",
                  "- Config via environment variables (12-factor app)",
                  "- Validate all env vars at startup with a Zod schema",
                  "- Single `config.ts` module exports the validated config object"
                ].join("\n")
              },
              {
                name: "nodejs-backend-design",
                description: "Design patterns for Node.js backend applications",
                body: [
                  "# Node.js Backend Design Patterns",
                  "",
                  "## tRPC Patterns",
                  "- Define one tRPC router per feature: `export const usersRouter = router({ ... })`",
                  "- Merge feature routers into a root `appRouter` in `src/router.ts`",
                  "- Export `type AppRouter = typeof appRouter` for client type inference",
                  "- Use Zod schemas for `.input()` and `.output()` on every procedure",
                  "- Use `publicProcedure` and `protectedProcedure` base procedures with middleware",
                  "",
                  "## Middleware",
                  "- Auth middleware: validate tokens, attach user context via tRPC context",
                  "- Logging middleware: structured JSON logs with request ID, duration, status",
                  "- Error handling: throw `TRPCError` with typed codes (`NOT_FOUND`, `UNAUTHORIZED`, etc.)",
                  "",
                  "## Database Patterns",
                  "- Drizzle schema files colocated with features (`features/users/schema.ts`)",
                  "- Repository functions take the Drizzle `db` instance as first parameter",
                  "- Use Drizzle transactions for multi-table operations",
                  "- Migrations managed via `drizzle-kit` (`drizzle/migrations/` directory)"
                ].join("\n")
              },
              {
                name: "nodejs-backend-code",
                description:
                  "Code style conventions for Node.js backend applications",
                body: [
                  "# Node.js Backend Code Conventions",
                  "",
                  "## TypeScript",
                  "- Enable strict mode in tsconfig",
                  "- Never use `any` — prefer `unknown` and narrow with Zod or type guards",
                  "- Infer types from Drizzle schema (`typeof users.$inferSelect`) and tRPC (`inferRouterInputs`, `inferRouterOutputs`)",
                  "- Use `satisfies` operator for config and constant objects",
                  "",
                  "## Naming",
                  "- tRPC routers: `*.router.ts` (e.g. `users.router.ts`)",
                  "- Services: `*.service.ts` (e.g. `users.service.ts`)",
                  "- Repositories: `*.repository.ts` (e.g. `users.repository.ts`)",
                  "- Drizzle table schemas: `*.schema.ts` (e.g. `users.schema.ts`)",
                  "",
                  "## Imports",
                  "- Use path aliases for project imports (`@/features/...`, `@/lib/...`)",
                  "- Prefer named exports over default exports",
                  "- Barrel files (`index.ts`) per feature for public API only"
                ].join("\n")
              },
              {
                name: "nodejs-backend-testing",
                description:
                  "Testing conventions for Node.js backend applications",
                body: [
                  "# Node.js Backend Testing Conventions",
                  "",
                  "## Unit Tests",
                  "- Test services with mocked repositories using `vi.mock()`",
                  "- Test Zod schemas independently with valid and invalid inputs",
                  "- Test file colocation: `*.spec.ts` next to source file",
                  "",
                  "## Integration Tests",
                  "- Test tRPC procedures using `createCaller` — no HTTP needed",
                  "- Database tests against a real test database",
                  "- Use transaction rollback per test for isolation",
                  "- Run Drizzle migrations before the test suite",
                  "",
                  "## Patterns",
                  "- Use Vitest as test runner and assertion library",
                  "- Do not mock tRPC internals — test through the caller API",
                  "- Factory functions for test data (avoid fixtures with implicit state)",
                  "- Assert on returned data and side effects, not internal implementation"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "docset",
          config: {
            id: "trpc-docs",
            label: "tRPC",
            origin: "https://github.com/trpc/trpc.git",
            description: "End-to-end type-safe APIs, routers, and procedures"
          }
        },
        {
          writer: "docset",
          config: {
            id: "drizzle-orm-docs",
            label: "Drizzle ORM",
            origin: "https://github.com/drizzle-team/drizzle-orm.git",
            description: "Type-safe SQL schema, queries, and migrations"
          }
        },
        {
          writer: "docset",
          config: {
            id: "express-docs",
            label: "Express",
            origin: "https://github.com/expressjs/express.git",
            description: "HTTP server, routing, and middleware"
          }
        },
        {
          writer: "docset",
          config: {
            id: "zod-docs",
            label: "Zod",
            origin: "https://github.com/colinhacks/zod.git",
            description: "TypeScript-first schema validation"
          }
        }
      ]
    },
    {
      id: "java-backend",
      label: "Java Backend",
      description:
        "Production-grade API server with Spring Boot 3, JPA/Hibernate, Gradle, and Lombok",
      recipe: [
        {
          writer: "skills",
          config: {
            skills: [
              {
                name: "java-backend-architecture",
                description:
                  "Architecture conventions for Spring Boot backend applications",
                body: [
                  "# Java Backend Architecture Conventions",
                  "",
                  "## Project Structure",
                  "- Layered architecture: `controller/` → `service/` → `repository/`",
                  "- Organize by feature, not by layer (e.g. `com.app.user/`, `com.app.order/`)",
                  "- Each feature package contains its own controller, service, repository, DTOs, and entity classes",
                  "- Shared code in a `common/` or `shared/` package (exceptions, base entities, utilities)",
                  "- Entry point: `@SpringBootApplication` class in root package",
                  "",
                  "## Module Boundaries",
                  "- Controllers handle HTTP concerns only — delegate to services immediately",
                  "- Services contain business logic, call repositories, never touch `HttpServletRequest`/`HttpServletResponse`",
                  "- Repositories extend `JpaRepository` or `CrudRepository` — no business logic",
                  "- Cross-feature communication goes through service interfaces, not direct repository access",
                  "",
                  "## Configuration",
                  "- Use `application.yml` with Spring profiles (`dev`, `test`, `prod`)",
                  "- Externalize secrets via environment variables with `${ENV_VAR}` placeholders",
                  "- Type-safe config with `@ConfigurationProperties` classes annotated with `@Validated`",
                  "- Gradle build with Kotlin DSL (`build.gradle.kts`)"
                ].join("\n")
              },
              {
                name: "java-backend-design",
                description:
                  "Design patterns for Spring Boot backend applications",
                body: [
                  "# Java Backend Design Patterns",
                  "",
                  "## REST API Patterns",
                  "- Use `@RestController` with `@RequestMapping` per feature (e.g. `/api/v1/users`)",
                  "- DTOs for request/response — never expose JPA entities directly",
                  "- Use `@Valid` with Jakarta Bean Validation annotations on request DTOs",
                  "- Return `ResponseEntity<T>` for explicit status codes, or direct objects for 200 OK",
                  "- Use `@ControllerAdvice` with `@ExceptionHandler` for centralized error handling",
                  "",
                  "## JPA/Hibernate Patterns",
                  "- Entities use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`",
                  "- Use `@Entity` with explicit `@Table(name = ...)` and `@Column` mappings",
                  "- Prefer `FetchType.LAZY` for associations — use `@EntityGraph` or join fetch for eager loading when needed",
                  "- Database migrations managed by Flyway (`db/migration/V1__description.sql`)",
                  "- Use Spring Data JPA derived queries or `@Query` with JPQL",
                  "",
                  "## Middleware & Cross-Cutting",
                  "- Security with Spring Security filter chain — JWT or session-based",
                  "- Structured logging with SLF4J + Logback, MDC for request correlation",
                  "- Use `@Transactional` on service methods, read-only where appropriate"
                ].join("\n")
              },
              {
                name: "java-backend-code",
                description:
                  "Code style conventions for Spring Boot backend applications",
                body: [
                  "# Java Backend Code Conventions",
                  "",
                  "## Lombok Usage",
                  "- Use `@Data` for DTOs, `@Value` for immutable objects",
                  "- Use `@Builder` for entities and complex DTOs",
                  "- Use `@RequiredArgsConstructor` for constructor injection (preferred over `@Autowired`)",
                  "- Use `@Slf4j` for logger injection",
                  "",
                  "## Naming",
                  "- Controllers: `*Controller.java` (e.g. `UserController.java`)",
                  "- Services: `*Service.java` interface + `*ServiceImpl.java`",
                  "- Repositories: `*Repository.java` (e.g. `UserRepository.java`)",
                  "- Entities: singular noun (e.g. `User.java`, `Order.java`)",
                  "- DTOs: `*Request.java`, `*Response.java` (e.g. `CreateUserRequest.java`)",
                  "",
                  "## Dependency Injection",
                  "- Constructor injection via `@RequiredArgsConstructor` — never field injection",
                  "- Declare dependencies as `private final` fields",
                  "- Program to interfaces for services (e.g. inject `UserService`, not `UserServiceImpl`)"
                ].join("\n")
              },
              {
                name: "java-backend-testing",
                description:
                  "Testing conventions for Spring Boot backend applications",
                body: [
                  "# Java Backend Testing Conventions",
                  "",
                  "## Unit Tests",
                  "- Test services with mocked repositories using `@ExtendWith(MockitoExtension.class)`",
                  "- Use `@Mock` for dependencies and `@InjectMocks` for the class under test",
                  "- Test DTOs and validation annotations independently",
                  "- Follow `given/when/then` structure with descriptive method names",
                  "",
                  "## Integration Tests",
                  "- Use `@SpringBootTest` with `@AutoConfigureMockMvc` for controller tests",
                  "- Test through `MockMvc` — assert on status, headers, and JSON body",
                  "- Use `@DataJpaTest` for repository tests with an embedded H2 database",
                  "- Use `@Testcontainers` for integration tests against real databases (PostgreSQL, MySQL)",
                  "- Use `@Transactional` on test classes for automatic rollback",
                  "",
                  "## Patterns",
                  "- JUnit 5 as test framework, AssertJ for fluent assertions",
                  "- Test file location: `src/test/java/` mirroring main source structure",
                  "- Factory methods or builders for test data — avoid shared mutable fixtures",
                  "- Use `@WithMockUser` for security-aware controller tests"
                ].join("\n")
              }
            ]
          }
        },
        {
          writer: "docset",
          config: {
            id: "spring-boot-docs",
            label: "Spring Boot",
            origin: "https://github.com/spring-projects/spring-boot.git",
            description:
              "Spring Boot framework, auto-configuration, and actuator"
          }
        },
        {
          writer: "docset",
          config: {
            id: "spring-data-jpa-docs",
            label: "Spring Data JPA",
            origin: "https://github.com/spring-projects/spring-data-jpa.git",
            description: "JPA repositories, derived queries, and specifications"
          }
        },
        {
          writer: "docset",
          config: {
            id: "spring-security-docs",
            label: "Spring Security",
            origin: "https://github.com/spring-projects/spring-security.git",
            description: "Authentication, authorization, and security filters"
          }
        },
        {
          writer: "docset",
          config: {
            id: "lombok-docs",
            label: "Lombok",
            origin: "https://github.com/projectlombok/lombok.git",
            description:
              "Boilerplate reduction with annotations for getters, builders, and constructors"
          }
        }
      ]
    }
  ]
};
