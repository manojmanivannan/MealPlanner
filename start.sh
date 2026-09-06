#!/usr/bin/env bash
#
# mealplanner — compose control script
#
# Profiles (defined in docker-compose.yml):
#   local  Dev frontend (nginx) with file-watch/sync.  [default]
#   prod   Production frontend served over Tailscale.
#
# Usage:
#   ./start.sh up [--profile local|prod] [flags]   Build & start a profile (default: local)
#   ./start.sh down [--profile local|prod] [-v]     Stop & remove (default: ALL profiles, orphan-safe)
#   ./start.sh restart [--profile local|prod] ...  Down then up
#   ./start.sh logs [--profile local|prod] [service] Follow logs (all, or one service)
#   ./start.sh build [--profile local|prod]        Build images without starting
#   ./start.sh status [--profile ...]              Show container status
#   ./start.sh help                                Show this help
#
# Flags:
#   -p, --profile NAME   Target profile: local or prod
#   -d, --detach         (up) run in background, no file watch
#   --no-build           (up/build) skip the image build and frontend dist build
#   -v, --volumes        (down/restart) also wipe named volumes (DROPS THE DB)
#
# Examples:
#   ./start.sh up                          # local dev, foreground with watch
#   ./start.sh up -d                       # local dev, background
#   ./start.sh up --profile prod           # prod, detached by default
#   ./start.sh down                        # stop ALL profiles, keep DB
#   ./start.sh down --profile local        # stop local only
#   ./start.sh down -v                     # stop ALL AND wipe the DB
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
readonly PROFILES=(local prod)
readonly DEFAULT_PROFILE=local

# ---------------------------------------------------------------------------
# Pretty output (honors NO_COLOR / non-tty)
# ---------------------------------------------------------------------------
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
    C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'; C_RED=$'\033[31m'
    C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'; C_RESET=$'\033[0m'
else
    C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_RESET=""
fi

log()  { printf "${C_BOLD}▸ %s${C_RESET}\n" "$*"; }
note() { printf "${C_DIM}  %s${C_RESET}\n" "$*"; }
ok()   { printf "${C_GREEN}✓ %s${C_RESET}\n" "$*"; }
warn() { printf "${C_YELLOW}! %s${C_RESET}\n" "$*"; }
die()  { printf "${C_RED}✗ %s${C_RESET}\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
valid_profile() {
    local p="$1"
    for v in "${PROFILES[@]}"; do [[ "$p" == "$v" ]] && return 0; done
    return 1
}

# Returns the compose --profile flags for a given profile, or all profiles
# when PROFILE is empty.
profile_flags() {
    if [[ -n "${PROFILE:-}" ]]; then
        echo "--profile $PROFILE"
    else
        # All profiles — ensures profile-gated services (e.g. nginx-local) are
        # torn down with everything else. This avoids the stale-container /
        # dead-network "network not found" bug that happens when `down` is run
        # without the matching profile flag.
        local f=""
        for p in "${PROFILES[@]}"; do f+=" --profile $p"; done
        echo "$f"
    fi
}

# ---------------------------------------------------------------------------
# Shared argument parser
#   Sets globals: PROFILE (may be empty = all), DETACH, NO_BUILD, RM_VOLUMES, POSITIONAL
# ---------------------------------------------------------------------------
PROFILE=""
DETACH=0
NO_BUILD=0
RM_VOLUMES=0
POSITIONAL=()

parse_args() {
    PROFILE=""
    DETACH=0
    NO_BUILD=0
    RM_VOLUMES=0
    POSITIONAL=()
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -p|--profile)
                [[ $# -lt 2 ]] && die "--profile requires a value (local|prod)"
                valid_profile "$2" || die "Unknown profile '$2'. Valid: ${PROFILES[*]}"
                PROFILE="$2"; shift 2 ;;
            --profile=*)
                local v="${1#--profile=}"; valid_profile "$v" \
                  || die "Unknown profile '$v'. Valid: ${PROFILES[*]}"
                PROFILE="$v"; shift ;;
            -d|--detach)  DETACH=1; shift ;;
            --no-build)   NO_BUILD=1; shift ;;
            -v|--volumes) RM_VOLUMES=1; shift ;;
            -h|--help)    cmd_help; exit 0 ;;
            -*)           die "Unknown flag: $1" ;;
            *)           POSITIONAL+=("$1"); shift ;;
        esac
    done
}

# ---------------------------------------------------------------------------
# Frontend build (local profile bind-mounts ./frontend/dist into nginx —
# an empty dist makes nginx fail with a rewrite-cycle 500, so build it if
# the output is missing)
# ---------------------------------------------------------------------------
ensure_frontend_dist() {
    if [[ -f frontend/dist/index.html ]]; then
        ok "frontend/dist present"
        return 0
    fi

    log "frontend/dist missing — building frontend"
    command -v npm >/dev/null 2>&1 || die "npm not found; run 'npm ci && npm run build' in frontend/"
    [[ -d frontend/node_modules ]] || (cd frontend && npm ci)
    (cd frontend && npm run build) || die "frontend build failed"
    [[ -f frontend/dist/index.html ]] || die "build finished but frontend/dist/index.html is still missing"
    ok "frontend/dist built"
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
cmd_up() {
    parse_args "$@"
    local profile="${PROFILE:-$DEFAULT_PROFILE}"

    [[ "$profile" == local && $NO_BUILD -eq 0 ]] && ensure_frontend_dist

    local flags=(--profile "$profile" up)
    # prod runs detached by default; local stays in foreground for file watch.
    if [[ "$profile" == prod && $DETACH -eq 0 ]]; then flags+=("-d"); fi
    [[ $DETACH -eq 1 ]] && flags+=("-d")
    [[ $NO_BUILD -eq 0 ]] && flags+=("--build")

    log "Starting profile ${C_BLUE}$profile${C_RESET}"
    [[ "$profile" == local && $DETACH -eq 0 ]] \
        && note "foreground mode — file watch is active (Ctrl-C to stop)"

    docker compose "${flags[@]}"
    ok "Profile $profile is up"
}

cmd_down() {
    parse_args "$@"
    local scope="${PROFILE:-ALL profiles}"
    [[ $RM_VOLUMES -eq 1 ]] \
        && warn "removing named volumes — the database will be wiped"

    log "Stopping ${C_BLUE}$scope${C_RESET} & removing orphans"
    # shellcheck disable=SC2086
    local flags=( $(profile_flags) down --remove-orphans )
    [[ $RM_VOLUMES -eq 1 ]] && flags+=("--volumes")

    docker compose "${flags[@]}"
    ok "Stopped"
}

cmd_restart() {
    parse_args "$@"
    # down honors the same --profile scope; --volumes applies to the down phase.
    cmd_down "$@"
    # up defaults to local when no profile was given.
    cmd_up "$@"
}

cmd_logs() {
    parse_args "$@"
    # shellcheck disable=SC2086
    local flags=( $(profile_flags) logs -f --tail=200 )
    [[ ${#POSITIONAL[@]} -gt 0 ]] && flags+=("${POSITIONAL[@]}")
    docker compose "${flags[@]}"
}

cmd_build() {
    parse_args "$@"
    local profile="${PROFILE:-$DEFAULT_PROFILE}"
    log "Building profile ${C_BLUE}$profile${C_RESET}"
    docker compose --profile "$profile" build
    ok "Built"
}

cmd_status() {
    parse_args "$@"
    # shellcheck disable=SC2086
    docker compose $(profile_flags) ps
}

cmd_help() { sed -n '3,30p' "$0"; }

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
main() {
    [[ $# -eq 0 ]] && { cmd_help; exit 0; }
    local sub="$1"; shift
    case "$sub" in
        up)        cmd_up "$@" ;;
        down)      cmd_down "$@" ;;
        restart)  cmd_restart "$@" ;;
        logs)      cmd_logs "$@" ;;
        build)     cmd_build "$@" ;;
        status|ps) cmd_status "$@" ;;
        help|-h|--help) cmd_help ;;
        *) die "Unknown command '$sub'. Run './start.sh help'." ;;
    esac
}

main "$@"