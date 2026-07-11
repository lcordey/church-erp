# Réglages de l'application

## Thèmes visuels

- Le réglage `Thème` est disponible dans les réglages généraux.
- Les thèmes `Sable`, `Nuit`, `Forêt` et `Aube` utilisent les mêmes composants et
  des tokens de couleur sémantiques.
- Le choix est conservé localement dans le navigateur et appliqué avant le premier
  affichage afin d'éviter un flash du thème par défaut.
- Les surfaces d'application, la navigation, les en-têtes, les filtres, les
  formulaires, les dialogues et les réglages de lecture suivent le thème actif.
- Les pages de PDF et de partition restent sur un papier clair pour préserver le
  contraste des documents sources et des notations produites par OSMD.

## Installation de l'application

- La bannière d'installation apparaît lorsque le navigateur expose le prompt PWA.
- `Plus tard` masque uniquement cette bannière pendant 24 heures sur l'appareil.
- Le prompt différé reste disponible dans la section `Application`, tout en bas
  des réglages, afin de pouvoir installer sans attendre le retour de la bannière.
- Si l'application est déjà installée ou si le navigateur ne permet pas le prompt
  direct, la section reste visible et explique l'état courant.

## Notifications de service

- L'activation est volontaire et propre à chaque appareil compatible Web Push.
- Le contrôle demande la permission système après un geste explicite puis
  associe l'abonnement au compte connecté.
- L'utilisateur peut désactiver l'appareil depuis la même section.
- La configuration serveur et les règles d'envoi sont détaillées dans
  `push-notifications.md`.
