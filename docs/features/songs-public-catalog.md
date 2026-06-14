# Feature: Catalogue public des chants

## Objectif

Exposer une liste publique des chants publies afin de pouvoir consulter le repertoire sans authentification.

## Valeur utilisateur

- l'equipe louange peut partager rapidement le catalogue public
- le projet obtient sa premiere vraie tranche verticale de lecture publique
- l'equipe valide la base, l'API, l'UI et les tests sur un scope reduit

## Perimetre

- lister les chants publies
- afficher le titre, le slug, la langue et les metadonnees utiles a la navigation
- permettre l'ouverture d'une page detail publique
- exclure les chants brouillon des resultats publics

## Regles metier

- seuls les chants avec le statut `published` sont visibles publiquement
- les chants brouillon n'apparaissent jamais dans le catalogue public
- l'acces public est strictement en lecture seule

## Donnees concernees

Champs partages recommandes pour un chant :
- `id`
- `title`
- `slug`
- `language`
- `status`

Pour MVP-1, le premier format supporte est :
- une source `ChordPro` attachee au chant

Le contenu source ne doit pas etre reduit a un simple champ `lyrics` sur la table `songs` si l'on veut permettre plusieurs formats par chant.

## Structure backend

Besoins probables :
- une requete repository pour recuperer les chants publies
- un service pour appliquer les regles de lecture publique
- un endpoint public de type `GET /api/songs`
- un endpoint public ou une route de detail pour un chant publie par slug

## Structure UI

- une page catalogue mobile-friendly
- une page detail publique pour un chant
- une separation claire entre navigation publique et edition admin

## Tests

- test unitaire sur la regle de filtrage public
- test API verifiant que les brouillons sont exclus
- test end-to-end de navigation dans le catalogue public

## Hors perimetre

- authentification
- edition admin
- recherche avancee
- pagination sauf si elle devient necessaire tout de suite
