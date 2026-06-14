# MVP-1

## Objectif

Livrer la plus petite application utile pour l'equipe louange, tout en validant toute la verticalite locale :
- application Next.js
- PostgreSQL local via Supabase
- logique metier cote serveur
- fonctionnalites connectees a la base
- tests locaux
- utilisation confortable sur telephone
- structure compatible avec une future PWA

Cette phase est volontairement etroite. Ce n'est pas encore l'ERP complet de l'eglise.

## Utilisateurs cibles

Seule l'equipe louange utilise l'application dans le MVP-1.

Hypothese operationnelle :
- tous les utilisateurs reels sont traites comme administrateurs
- il n'y a pas encore besoin de gerer des comptes, groupes ou permissions fines

Contrainte d'architecture :
- les actions d'administration doivent tout de meme rester identifiables comme des actions privilegiees pour pouvoir ajouter de vraies restrictions plus tard

## Criteres de reussite

Le MVP-1 est reussi s'il prouve que le projet peut :
- stocker de vraies donnees de chants en local
- exposer en securite les chants publies
- permettre des workflows internes d'administration
- fonctionner localement sur ordinateur et sur telephone
- rester pret pour l'authentification future, plusieurs formats de chants et des modules supplementaires

## Dans le perimetre

### Fondations
- regles projet dans `AGENTS.md`
- documentation d'architecture et de setup
- documentation par fonctionnalite
- workflow local de developpement en style Linux-first ou WSL-first

### Chants
- catalogue public des chants publies
- page detail d'un chant publie
- creation, modification, publication et retrait de la publication d'un chant
- support initial du format ChordPro
- recherche ou filtrage simple si cela reste petit et utile

### Mobile et compatibilite PWA
- interface responsive pour telephone
- test local dans le navigateur d'un telephone
- direction compatible avec une future installation PWA

### Qualite locale
- migrations de base de donnees
- donnees de seed
- tests unitaires sur les regles metier utiles
- tests end-to-end sur les parcours principaux

## Hors perimetre explicite

- authentification reelle
- groupes, roles et administration des permissions
- support PDF des chants
- autres formats de partitions ou de documents
- evenements, calendrier et setlists
- invitations a un evenement
- partage de chants a des participants
- lectures bibliques attachees a un evenement
- gestion des benevoles
- emails et rappels
- projection media
- mode hors ligne avance
- notifications push
- packaging mobile natif

## Regles produit du MVP-1

- les visiteurs publics ne peuvent lire que les chants publies
- les utilisateurs internes peuvent creer et modifier des chants
- toutes les ecritures passent par des frontieres serveur
- les cas d'usage publics et admin doivent rester distingues meme si la meme personne peut actuellement tout faire
- l'interface utilisateur est en francais
- le code reste en anglais

## Ordre de livraison recommande

1. catalogue public des chants en ChordPro
2. administration des chants
3. premiere couche PWA et verifications mobile

## Standard de tranche verticale

Chaque fonctionnalite implementee devrait idealement inclure :
- schema ou migration si necessaire
- logique repository
- logique service
- endpoint ou frontiere serveur
- interface utilisateur
- tests pertinents

## Vision d'acceptation

A la fin du MVP-1, tu dois pouvoir :
- demarrer le projet localement
- l'ouvrir depuis un telephone sur le reseau local
- consulter publiquement les chants publies
- administrer les chants en interne
- executer les principales validations locales avec confiance
