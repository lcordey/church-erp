# Feature: Setlists

## Objectif

Permettre a l'equipe louange de creer des sequences ordonnees de chants publies,
de les modifier, puis de les jouer en mode lecture.

## Perimetre

- lister les setlists existantes
- creer une setlist avec un titre
- modifier le titre et l'ordre des chants
- ajouter plusieurs chants publies, y compris le meme chant plusieurs fois
- retirer un chant d'une setlist
- supprimer une setlist
- jouer une setlist chant par chant
- passer au chant precedent ou suivant par boutons, clavier gauche/droite ou swipe horizontal

## Regles metier

- la liste des setlists et le mode lecture sont accessibles sans connexion
- la creation, la modification et la suppression d'une setlist exigent une session authentifiee
- une tentative d'ouverture de l'editeur sans session redirige vers la connexion puis revient sur la setlist demandee

- une setlist reference les chants via `songs.id`
- seuls les chants publies peuvent etre ajoutes
- une setlist peut etre vide pendant sa preparation
- l'ordre des chants est stocke dans `setlist_items.position`
- les ecritures passent par les routes backend et le service setlists
- MVP-1 traite encore tous les utilisateurs reels comme administrateurs

## Structure backend

- tables `setlists` et `setlist_items`
- repository Drizzle dans `src/modules/setlists`
- service `setlist-management` pour les regles metier
- endpoints:
  - `GET /api/setlists`
  - `POST /api/setlists`
  - `GET /api/setlists/:id`
  - `PUT /api/setlists/:id`
  - `DELETE /api/setlists/:id`

## Structure UI

- `/setlist` liste, cree et supprime les setlists
- `/setlist/:id` edite le titre et les chants
- `/setlist/:id/play` lance le mode lecture
- le mode lecture reutilise le rendu de chant public
- l'ajout de chants reutilise le catalogue public pagine, avec la meme recherche serveur et les memes filtres
- le mode lecture immersif conserve le header de la setlist et ses actions precedent/suivant
- le rendu chant utilise le meme selecteur compact de source que la page detail, avec le PDF integre quand il existe
- lors du passage au chant suivant ou precedent, la source affichee est revalidee; si la source precedente n'existe pas sur le nouveau chant, le lecteur bascule automatiquement vers la meilleure source disponible selon la priorite globale
- le mode lecture peut basculer en plein ecran focus pour n'afficher que le contenu du chant et une sortie minimaliste
- les cartes de setlists ouvrent directement la lecture sans fleche ou indicateur d'ouverture dedie

## Tests

- tests service pour creation, validation des chants publies et reordonnancement
- tests API pour les routes de collection et de detail
- validation locale avec lint, typecheck, tests et build
