#!/usr/bin/env bash
# ============================================================================
# check-mobile-patterns.sh
# ----------------------------------------------------------------------------
# Détecte les violations des patterns responsive mobile dans le frontend.
# Référence : MOBILE-AUDIT-2026-04-29.md
#
# Usage :
#   ./scripts/check-mobile-patterns.sh           Audit complet (tout le repo)
#   ./scripts/check-mobile-patterns.sh --staged  Uniquement les fichiers stagés
#   ./scripts/check-mobile-patterns.sh --quiet   Ne sort que le compteur
#
# Exit code : 0 si aucune violation, 1 sinon (utilisable en pre-commit / CI)
# ============================================================================

set -e

# Couleurs ANSI (désactivées si stdout n'est pas un TTY)
if [ -t 1 ]; then
  RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; YELLOW=''; GREEN=''; BLUE=''; BOLD=''; NC=''
fi

# Mode
MODE="all"
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --staged) MODE="staged" ;;
    --quiet)  QUIET=1 ;;
  esac
done

# Sélection des fichiers à auditer
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E "frontend/src/components/.*\.jsx$" || true)
  if [ -z "$FILES" ]; then
    [ "$QUIET" -eq 0 ] && echo -e "${GREEN}✅ Aucun fichier JSX stagé — rien à vérifier${NC}"
    exit 0
  fi
else
  FILES=$(find frontend/src/components -name "*.jsx" -type f)
fi

ERRORS=0
TOTAL_VIOLATIONS=0

# ----------------------------------------------------------------------------
# C1 — Modals avec z-50 (devraient être z-60)
# Détection : lignes avec "fixed inset-0" ET "z-50" sur la même ligne
# Exclusions : Navigation.jsx (bottom nav + header légitimes en z-50)
# ----------------------------------------------------------------------------
[ "$QUIET" -eq 0 ] && echo -e "${BOLD}${BLUE}🔍 C1 — z-50 sur modals (devrait être z-60)${NC}"
violations=$(echo "$FILES" | xargs grep -lnE "fixed inset-0" 2>/dev/null \
  | xargs grep -lnE "fixed inset-0.*z-50|z-50.*fixed inset-0" 2>/dev/null \
  | grep -v "Navigation.jsx" || true)
if [ -n "$violations" ]; then
  count=$(echo "$violations" | wc -l | tr -d ' ')
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + count))
  ERRORS=$((ERRORS + 1))
  if [ "$QUIET" -eq 0 ]; then
    echo -e "${RED}  ❌ $count fichier(s) :${NC}"
    echo "$violations" | sed 's/^/     /'
  fi
else
  [ "$QUIET" -eq 0 ] && echo -e "${GREEN}  ✅ OK${NC}"
fi

# ----------------------------------------------------------------------------
# C2 — Modals sans bottom drawer (items-center sans items-end)
# Exclusions :
#   Navigation.jsx           — bottom nav, pattern intentionnel
#   DashboardCustomizePanel  — side drawer (top-right), items-end ne s'applique pas
#   AdminInstrumentPage      — modal desktop-only (bouton déclencheur hidden md:)
#   InstrumentPriceUpdateModal — desktop-only (PatrimoineActionBar)
#   ExchangeRateUpdateModal    — desktop-only (PatrimoineActionBar)
#   SnapshotPanel              — desktop-only (PatrimoineActionBar)
# ----------------------------------------------------------------------------
[ "$QUIET" -eq 0 ] && echo -e "${BOLD}${BLUE}🔍 C2 — Modals sans bottom drawer (items-end manquant)${NC}"
violations=""
for f in $(echo "$FILES" | xargs grep -lE "fixed inset-0" 2>/dev/null \
  | grep -v "Navigation.jsx" \
  | grep -v "DashboardCustomizePanel.jsx" \
  | grep -v "AdminInstrumentPage.jsx" \
  | grep -v "InstrumentPriceUpdateModal.jsx" \
  | grep -v "ExchangeRateUpdateModal.jsx" \
  | grep -v "SnapshotPanel.jsx"); do
  if ! grep -q "items-end" "$f" 2>/dev/null; then
    violations="$violations\n$f"
  fi
done
violations=$(echo -e "$violations" | grep -v '^$' || true)
if [ -n "$violations" ]; then
  count=$(echo "$violations" | wc -l | tr -d ' ')
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + count))
  ERRORS=$((ERRORS + 1))
  if [ "$QUIET" -eq 0 ]; then
    echo -e "${RED}  ❌ $count fichier(s) :${NC}"
    echo "$violations" | sed 's/^/     /'
  fi
else
  [ "$QUIET" -eq 0 ] && echo -e "${GREEN}  ✅ OK${NC}"
fi

# ----------------------------------------------------------------------------
# C3 — Tableaux sans wrapper overflow-x-auto
# ----------------------------------------------------------------------------
[ "$QUIET" -eq 0 ] && echo -e "${BOLD}${BLUE}🔍 C3 — Tableaux sans wrapper overflow-x-auto${NC}"
violations=""
for f in $(echo "$FILES" | xargs grep -lE "<table" 2>/dev/null); do
  if ! grep -qE "overflow-x-auto|overflow-auto" "$f" 2>/dev/null; then
    violations="$violations\n$f"
  fi
done
violations=$(echo -e "$violations" | grep -v '^$' || true)
if [ -n "$violations" ]; then
  count=$(echo "$violations" | wc -l | tr -d ' ')
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + count))
  ERRORS=$((ERRORS + 1))
  if [ "$QUIET" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ $count fichier(s) :${NC}"
    echo "$violations" | sed 's/^/     /'
  fi
else
  [ "$QUIET" -eq 0 ] && echo -e "${GREEN}  ✅ OK${NC}"
fi

# ----------------------------------------------------------------------------
# M1 + M2 — grid-cols-N sans fallback mobile (sm:/md:/lg:)
# ----------------------------------------------------------------------------
[ "$QUIET" -eq 0 ] && echo -e "${BOLD}${BLUE}🔍 M1+M2 — grid-cols-N sans fallback mobile${NC}"
violations=""
for f in $FILES; do
  matches=$(grep -nE "grid-cols-[2-9]" "$f" 2>/dev/null | grep -vE "(sm|md|lg|xl):grid-cols" || true)
  if [ -n "$matches" ]; then
    while IFS= read -r line; do
      violations="$violations\n$f:$line"
    done <<< "$matches"
  fi
done
violations=$(echo -e "$violations" | grep -v '^$' || true)
if [ -n "$violations" ]; then
  count=$(echo "$violations" | wc -l | tr -d ' ')
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + count))
  ERRORS=$((ERRORS + 1))
  if [ "$QUIET" -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ $count occurrence(s) :${NC}"
    echo "$violations" | sed 's/^/     /'
  fi
else
  [ "$QUIET" -eq 0 ] && echo -e "${GREEN}  ✅ OK${NC}"
fi

# ----------------------------------------------------------------------------
# Résultat global
# ----------------------------------------------------------------------------
echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅ Aucun problème détecté — patterns mobile respectés${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}❌ $ERRORS catégorie(s) en échec — $TOTAL_VIOLATIONS violation(s) au total${NC}"
  echo -e "${BLUE}   Voir MOBILE-AUDIT-2026-04-29.md pour les pistes de correction${NC}"
  exit 1
fi
