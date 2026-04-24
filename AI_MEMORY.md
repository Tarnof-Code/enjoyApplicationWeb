# AI MEMORY BANK (frontend — Enjoy)

Point d’entrée pour le contexte projet. Le détail est dans [`docs/ai/`](docs/ai/).

**Important (IA)** : ce pivot seul ne suffit pas. Lire aussi [`docs/ai/contexte-actif.md`](docs/ai/contexte-actif.md) et [`docs/ai/decisions-architecturales.md`](docs/ai/decisions-architecturales.md), puis les autres fiches selon la tâche.

## Invariants

Les règles obligatoires (langue, lint, patterns) sont dans [`.cursorrules`](.cursorrules).

## Fiches (`docs/ai/`)

| Fichier | Rôle |
|--------|------|
| [contexte-global-stack.md](docs/ai/contexte-global-stack.md) | Stack, tooling, structure du repo |
| [contexte-actif.md](docs/ai/contexte-actif.md) | Phase, journal des changements récents |
| [decisions-architecturales.md](docs/ai/decisions-architecturales.md) | Conventions et choix techniques |
| [etat-projet.md](docs/ai/etat-projet.md) | Tests, dette, sync types / contrat API, services, glossaire |
| [documentation-ui-routing.md](docs/ai/documentation-ui-routing.md) | Routes, écrans, auth, layout |
| [roadmap.md](docs/ai/roadmap.md) | Suivi des tâches |

Index : [docs/ai/README.md](docs/ai/README.md).

## Alignement backend (enjoyApi)

- Types partagés : `src/types/api.d.ts` — rester aligné avec les DTO / payloads documentés côté API.
- Références utilisateur côté JSON : **`tokenId`**, pas l’id SQL interne (voir conventions enjoyApi).
- Architecture & DTOs backend : [`../enjoyApi/AI_MEMORY.md`](../enjoyApi/AI_MEMORY.md).

## Convention de maintenance

- **« Mets à jour `AI_MEMORY.md` »** = ne pas y dupliquer le journal ni les détails fonctionnels : les écrire dans la **fiche adéquate** de [`docs/ai/`](docs/ai/) (souvent [`contexte-actif.md`](docs/ai/contexte-actif.md) pour l’historique, [`etat-projet.md`](docs/ai/etat-projet.md) pour glossaire / services, etc.). Ici, ne mettre à jour le pivot **que** si la table des fiches ou un invariant global change. Créer une nouvelle fiche si besoin et la lister ici + dans [`docs/ai/README.md`](docs/ai/README.md).
- Après un changement structurel (commit / push), appliquer la même discipline (voir section Memory Bank dans `.cursorrules`).
