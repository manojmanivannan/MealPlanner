#!/usr/bin/env bash
# mp.sh — thin CLI over the MealPlanner API (port 5000).
#
# Why this exists: the API has several shape quirks that are easy to get wrong
# with raw curl, so this wrapper encodes them once:
#   • Routers mount with NO /api prefix on port 5000 (nginx strips /api, but
#     we hit the backend directly).
#   • Login is OAuth2 form-data (username=...&password=...), NOT JSON.
#   • Ingredient create/update take QUERY PARAMS, not a JSON body.
#   • Recipe create/update take a JSON body and must NOT send nutrition fields
#     (a DB trigger computes them).
#   • Plan slot writes REPLACE the slot's recipe_ids; they do not append.
#   • Day enum is capitalized ("Monday"); meal_type is lowercase snake_case
#     ("pre_breakfast"). Only 5 meal types are plannable.
#
# Config via env, all with defaults:
#   MP_BASE_URL  (default http://localhost:5000)
#   MP_USER      (default demo@demo.com)
#   MP_PASS      (default demo123)
#   MP_TOKEN_FILE (default ~/.cache/mealplanner/token)
set -euo pipefail

BASE_URL="${MP_BASE_URL:-http://localhost:5000}"
MP_USER="${MP_USER:-demo@demo.com}"
MP_PASS="${MP_PASS:-demo123}"
TOKEN_FILE="${MP_TOKEN_FILE:-$HOME/.cache/mealplanner/token}"

die() { echo "mp: error: $*" >&2; exit 1; }

need_jq() { command -v jq >/dev/null 2>&1 || die "jq is required for this command"; }

# --- auth -------------------------------------------------------------------
login() {
  # OAuth2 password flow: form-data, not JSON. Returns {access_token,token_type}.
  local resp
  resp=$(curl -fsS -m 15 -X POST "$BASE_URL/auth/login" \
    --data-urlencode "username=$MP_USER" \
    --data-urlencode "password=$MP_PASS" 2>&1) || die "login failed: $resp"
  local tok
  tok=$(printf '%s' "$resp" | jq -r '.access_token // empty')
  [ -n "$tok" ] || die "login succeeded but no access_token in response: $resp"
  mkdir -p "$(dirname "$TOKEN_FILE")"
  printf '%s' "$tok" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  printf '%s' "$tok"
}

# Return a cached token, logging in first if there is none. Tokens last 24h;
# the server returns 401 on expiry, so callers retry once on 401.
token() {
  if [ -s "$TOKEN_FILE" ]; then
    cat "$TOKEN_FILE"
    return
  fi
  login
}

# curl with auth + JSON content-type. $1=method, $2=path, rest=curl args.
# Retries once on 401 by forcing a fresh login.
auth_curl() {
  local method="$1"; shift
  local path="$1"; shift
  local tok; tok=$(token)
  local code body
  body=$(curl -sS -m 30 -X "$method" "$BASE_URL$path" \
    -H "Authorization: Bearer $tok" \
    -H "Content-Type: application/json" \
    "$@" 2>&1) || { echo "$body"; return 1; }
  # Detect 401 → re-login once, retry.
  if printf '%s' "$body" | grep -qi '"detail".*"Could not validate credentials"'; then
    tok=$(login)
    body=$(curl -fsS -m 30 -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $tok" \
      -H "Content-Type: application/json" \
      "$@" 2>&1) || { echo "$body"; return 1; }
  fi
  printf '%s' "$body"
}

# curl with auth but NO JSON content-type (for query-param endpoints + downloads).
auth_curl_raw() {
  local method="$1"; shift
  local path="$1"; shift
  local tok; tok=$(token)
  local body
  body=$(curl -sS -m 30 -X "$method" "$BASE_URL$path" \
    -H "Authorization: Bearer $tok" "$@" 2>&1) || { echo "$body"; return 1; }
  if printf '%s' "$body" | grep -qi '"detail".*"Could not validate credentials"'; then
    tok=$(login)
    body=$(curl -fsS -m 30 -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $tok" "$@" 2>&1) || { echo "$body"; return 1; }
  fi
  printf '%s' "$body"
}

# --- arg helpers ------------------------------------------------------------
# Read a JSON payload from a file path, "-" (stdin), or a literal arg.
read_json_arg() {
  local a="$1"
  if [ "$a" = "-" ]; then cat
  elif [ -f "$a" ]; then cat "$a"
  else printf '%s' "$a"
  fi
}

# Normalize a day name to the API's capitalized form ("monday"/"MONDAY"→"Monday").
norm_day() {
  local d="${1,,}"           # lowercase
  printf '%s' "${d^}"        # capitalize first letter
}

# Validate a meal_type is one of the 5 plannable ones; echo it back.
PLANNABLE="pre_breakfast breakfast lunch dinner snack"
valid_meal() {
  local m="$1"
  for p in $PLANNABLE; do [ "$m" = "$p" ] && { printf '%s' "$m"; return 0; }; done
  die "meal_type '$m' is not plannable. Plannable: $PLANNABLE (sides, weekend_prep are catalogue-only)."
}

# --- commands ---------------------------------------------------------------
cmd_me()       { auth_curl GET /auth/me; }
cmd_units()    { curl -fsS -m 10 "$BASE_URL/utilities/list-serving-units"; }

cmd_recipes() {
  local qa=""
  [ "${1:-}" = "--only-available" ] && qa="?only_available=true"
  auth_curl GET "/recipes$qa"
}

cmd_recipe()   { need_jq; local id="${1:?usage: mp recipe <id>}"; auth_curl GET "/recipes/$id"; }

cmd_recipe_create() {
  local payload; payload=$(read_json_arg "${1:?usage: mp recipe-create <json|file|->}")
  printf '%s' "$payload" | jq -e . >/dev/null 2>&1 || die "recipe-create: payload is not valid JSON."
  auth_curl POST /recipes --data "$payload"
}

cmd_recipe_update() {
  local id="${1:?usage: mp recipe-update <id> <json|file|->}"
  local payload; payload=$(read_json_arg "${2:?usage: mp recipe-update <id> <json|file|->}")
  printf '%s' "$payload" | jq -e . >/dev/null 2>&1 || die "recipe-update: payload is not valid JSON."
  auth_curl PUT "/recipes/$id" --data "$payload"
}

cmd_recipe_delete() {
  local id="${1:?usage: mp recipe-delete <id>}"
  auth_curl DELETE "/recipes/$id"
}

cmd_ingredients() {
  need_jq
  local sort="" filter=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --sort=*) sort="${1#--sort=}";;
      --available) filter='[.[] | select(.available==true)]';;
      --unavailable) filter='[.[] | select(.available==false)]';;
      *) die "unknown ingredients flag: $1";;
    esac
    shift
  done
  local qa=""; [ -n "$sort" ] && qa="?sort=$sort"
  if [ -n "$filter" ]; then auth_curl GET "/ingredients$qa" | jq "$filter"
  else auth_curl GET "/ingredients$qa"; fi
}

# No GET /ingredients/{id} endpoint exists, so list and filter by id.
cmd_ingredient() {
  need_jq
  local id="${1:?usage: mp ingredient <id>}"
  auth_curl GET /ingredients | jq --argjson id "$id" '.[] | select(.id==$id)'
}

cmd_ingredient_add() {
  # POST /ingredients takes QUERY PARAMS: name, shelf_life, serving_unit.
  # serving_size defaults to 100 for g/ml, 1 otherwise; available defaults false.
  local name="" shelf_life="" unit=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --name=*) name="${1#--name=}";;
      --shelf-life=*) shelf_life="${1#--shelf-life=}";;
      --unit=*) unit="${1#--unit=}";;
      *) die "unknown ingredient-add flag: $1";;
    esac
    shift
  done
  [ -n "$name" ] && [ -n "$unit" ] || die "ingredient-add requires --name and --unit (and usually --shelf-life)."
  local qa="?name=$(jq -rn --arg v "$name" '$v|@uri')&shelf_life=$(jq -rn --arg v "$shelf_life" '$v|@uri')&serving_unit=$(jq -rn --arg v "$unit" '$v|@uri')"
  auth_curl_raw POST "/ingredients$qa"
}

# Build a query string from --flag=value pairs. Empty value (--energy=) means
# "clear this field to NULL" for nutrition, which the API accepts.
build_qstr() {
  local q="" k v
  while [ $# -gt 0 ]; do
    case "$1" in
      --*=*)
        k="${1%%=*}"; k="${k#--}"; v="${1#*=}"
        k="${k//-/_}"   # --shelf-life → shelf_life (API uses underscores)
        q="${q}&${k}=$(jq -rn --arg v "$v" '$v|@uri')"
        ;;
      *) die "ingredient-update: expected --field=value, got: $1";;
    esac
    shift
  done
  printf '%s' "${q:1}"
}

cmd_ingredient_update() {
  local id="${1:?usage: mp ingredient-update <id> --field=value ...}"; shift
  local q; q=$(build_qstr "$@")
  [ -n "$q" ] || die "ingredient-update: no fields given."
  auth_curl_raw PUT "/ingredients/$id?$q"
}

cmd_ingredient_delete() {
  local id="${1:?usage: mp ingredient-delete <id>}"
  auth_curl_raw DELETE "/ingredients/$id"
}

# Pantry = the `available` flag on ingredients.
cmd_pantry() {
  need_jq
  local what="${1:-list}"
  case "$what" in
    list) auth_curl GET /ingredients | jq '[.[] | select(.available==true)]';;
    add|remove)
      local id="${2:?usage: mp pantry add|remove <id>}"
      local val="true"; [ "$what" = "remove" ] && val="false"
      auth_curl_raw PUT "/ingredients/$id?available=$val"
      ;;
    *) die "mp pantry: unknown subcommand '$what' (list|add|remove)";;
  esac
}

cmd_plan()      { auth_curl GET /weekly-plan; }

# PUT /weekly-plan REPLACES the slot. recipe_ids is a comma-separated list,
# or empty to clear. Always sends the full desired set for that day+meal.
cmd_plan_set() {
  local day="${1:?usage: mp plan-set <day> <meal_type> [id,id,...]}"
  local meal="${2:?usage: mp plan-set <day> <meal_type> [id,id,...]}"
  local ids="${3:-}"
  day=$(norm_day "$day"); meal=$(valid_meal "$meal")
  local arr="[]"
  if [ -n "$ids" ]; then
    arr=$(printf '%s' "$ids" | tr ',' '\n' | jq -R . | jq -s .)
  fi
  local payload; payload=$(jq -nc --arg d "$day" --arg m "$meal" --argjson r "$arr" \
    '{day:$d, meal_type:$m, recipe_ids:$r}')
  auth_curl PUT /weekly-plan --data "$payload"
}

cmd_plan_clear() {
  local day="${1:?usage: mp plan-clear <day> <meal_type>}"
  local meal="${2:?usage: mp plan-clear <day> <meal_type>}"
  cmd_plan_set "$day" "$meal" ""
}

cmd_plan_pdf() {
  local out="${1:-weekly_plan.pdf}"
  local tok; tok=$(token)
  curl -fsS -m 30 "$BASE_URL/weekly-plan/pdf" \
    -H "Authorization: Bearer $tok" -o "$out" || die "pdf download failed"
  echo "saved $out"
}

cmd_nutrition() {
  local day="${1:?usage: mp nutrition <day>}"
  day=$(norm_day "$day")
  auth_curl GET "/utilities/nutrition/$day"
}

cmd_shopping() { auth_curl GET /utilities/shopping-list; }

# --- dispatch ---------------------------------------------------------------
usage() {
cat <<'EOF'
mp — MealPlanner API CLI (port 5000)

auth & meta:
  mp login                       force a fresh login, print token
  mp me                          GET /auth/me
  mp units                       serving units (g ml cup tbsp tsp nos)

recipes (JSON bodies; do NOT include nutrition fields):
  mp recipes [--only-available]  list
  mp recipe <id>                 get one
  mp recipe-create  <json|file|->   POST  (stdin if "-")
  mp recipe-update  <id> <json|file|->   PUT (owned recipes only)
  mp recipe-delete  <id>         DELETE (owned recipes only)

ingredients (query-param endpoints):
  mp ingredients [--sort col] [--available|--unavailable]
  mp ingredient <id>             get one (list+filter; no single-item endpoint)
  mp ingredient-add    --name=N --unit=U [--shelf-life=S]
  mp ingredient-update <id> --field=value ...   (--field= clears a nutrition field)
  mp ingredient-delete <id>      (405 if any recipe uses it)

pantry (the `available` flag):
  mp pantry list                 ingredients currently available
  mp pantry add <id>             mark available (sets last_available)
  mp pantry remove <id>          mark unavailable

weekly plan (slot writes REPLACE, they do not append):
  mp plan                        full week as {day:{meal:[ids]}}
  mp plan-set   <day> <meal> [id,id,...]   set a slot's recipes
  mp plan-clear <day> <meal>     empty a slot
  mp plan-pdf [outfile.pdf]      download the plan PDF

utilities:
  mp nutrition <day>             macros for one day
  mp shopping-list               derived shopping list (read-only)

days: Monday..Sunday (any case accepted). meals: pre_breakfast breakfast lunch dinner snack.
EOF
}

main() {
  [ $# -eq 0 ] && { usage; exit 0; }
  local cmd="$1"; shift
  case "$cmd" in
    login) login;;
    me) cmd_me;;
    units) cmd_units;;
    recipes) cmd_recipes "$@";;
    recipe) cmd_recipe "$@";;
    recipe-create) cmd_recipe_create "$@";;
    recipe-update) cmd_recipe_update "$@";;
    recipe-delete) cmd_recipe_delete "$@";;
    ingredients) cmd_ingredients "$@";;
    ingredient) cmd_ingredient "$@";;
    ingredient-add) cmd_ingredient_add "$@";;
    ingredient-update) cmd_ingredient_update "$@";;
    ingredient-delete) cmd_ingredient_delete "$@";;
    pantry) cmd_pantry "$@";;
    plan) cmd_plan;;
    plan-set) cmd_plan_set "$@";;
    plan-clear) cmd_plan_clear "$@";;
    plan-pdf) cmd_plan_pdf "$@";;
    nutrition) cmd_nutrition "$@";;
    shopping-list) cmd_shopping;;
    -h|--help|help) usage;;
    *) die "unknown command '$cmd' (try: mp help)";;
  esac
}

main "$@"