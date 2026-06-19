# Feature: Catalogue public des chants

## Objectif

Exposer une liste publique des chants publies afin de pouvoir consulter le repertoire sans authentification.

## Valeur utilisateur

- l'equipe louange peut partager rapidement le catalogue public
- le projet obtient sa premiere vraie tranche verticale de lecture publique
- l'equipe valide la base, l'API, l'UI et les tests sur un scope reduit

## Perimetre

- lister les chants publies
- afficher le titre, le slug, les metadonnees utiles a la navigation et les informations de recueil quand elles existent
- permettre l'ouverture d'une page detail publique
- exclure les chants brouillon des resultats publics
- rendre les paroles et accords de la source ChordPro active
- afficher un lien vers la partition PDF quand une source PDF active existe
- chercher les chants publies par titre ou numero de recueil
- filtrer le catalogue sans rechargement de page
- filtrer par recueil via des cases a cocher fixes

## Regles metier

- seuls les chants avec le statut `published` sont visibles publiquement
- les chants brouillon n'apparaissent jamais dans le catalogue public
- l'acces public est strictement en lecture seule
- la recherche MVP-1 couvre le titre, le code de recueil, le numero brut et le numero zero-pad
- le filtre par recueil propose les collections presentes dans le seed courant, y compris les recueils JEMAF importes et `LeMont`
- le filtre par recueil n'est pas un champ libre
- aucune case recueil cochee signifie que tous les recueils sont affiches
- a l'ouverture du repertoire sans filtre URL, les recueils `JEM`, `JEMK` et `LeMont` sont coches par defaut
- la page publique charge le catalogue publie puis filtre cote client pour une interaction fluide
- l'API `GET /api/songs?q=...` conserve une recherche serveur utilisable par les futurs clients
- l'API publique expose uniquement les metadonnees PDF utiles et une URL backend de telechargement
- le chemin Supabase Storage interne n'est jamais expose au navigateur
- le seed local du catalogue public reste rejouable hors ligne meme si le snapshot JEMAF a ete collecte depuis le reseau
- la recherche par auteur, paroles ou themes est reportee

## Donnees concernees

Champs partages recommandes pour un chant :
- `id`
- `title`
- `slug`
- `status`
- `author`
- `copyright`
- `default_key`
- `collection`
- `collection_number`
- `source_page_url`

Pour MVP-1, le premier format supporte est :
- une source `ChordPro` attachee au chant
- une source `PDF` optionnelle attachee au chant

Le contenu source ne doit pas etre reduit a un simple champ `lyrics` sur la table `songs` si l'on veut permettre plusieurs formats par chant.

## Structure backend

Implementation actuelle :
- repository Drizzle dans le module `songs`
- service public qui revalide le statut `published`
- endpoint `GET /api/songs` pour les resumes publics
- endpoint `GET /api/songs/:slug` pour le detail public
- endpoint `GET /api/songs/:slug/pdf` pour servir une partition PDF active
- acces direct aux tables refuse aux roles Supabase Data API

## Structure UI

- une page catalogue mobile-friendly
- un champ de recherche sobre en haut du catalogue
- des cases a cocher pour les recueils disponibles
- un compteur de resultats qui suit le filtre courant
- l'ouverture d'un chant depuis le catalogue navigue vers sa page detail
- un bouton `Nouveau chant` reste accessible dans le header du catalogue
- route publique du catalogue sur `/`
- route publique de detail sur `/chants/:slug`
- controle de transposition temporaire sur la page detail
- lien `Partition PDF` sur la page detail quand une partition est disponible
- preference persistante de notation anglaise ou francaise
- le catalogue conserve la recherche et les filtres tant que l'utilisateur reste sur la page catalogue

## Tests

- tests unitaires sur la regle de filtrage public
- tests unitaires sur le parsing ChordPro initial
- tests unitaires sur la notation et la transposition
- tests de contrat des routes API
- tests de contrat de la route PDF publique
- smoke test HTTP du catalogue
- test end-to-end de navigation reporte a l'installation de Playwright

## Limites du rendu ChordPro initial

- directives de titre et tonalite masquees dans le corps du chant
- accords entre crochets affiches au-dessus des paroles
- sections courantes et commentaires rendus comme intertitres
- si un commentaire precede immediatement une section ChordPro, le rendu l'utilise comme etiquette visible unique pour cette section
- les commentaires ChordPro peuvent indiquer les repetitions visibles comme `x2`
- transposition temporaire disponible sans modifier la tonalite enregistree
- notation anglaise ou francaise appliquee aux accords affiches
- annotations avancees et mise en page d'impression hors perimetre

## Hors perimetre

- authentification
- edition admin
- recherche avancee
- recherche par paroles, auteur ou theme
- pagination sauf si elle devient necessaire tout de suite
