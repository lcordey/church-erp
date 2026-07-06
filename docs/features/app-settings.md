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

- Un bloc `Application` est disponible dans `Réglages` pour relancer
  l'installation PWA sur l'appareil courant.
- Ce point d'entrée permet de réessayer même si la bannière automatique a déjà
  été fermée.
- Sur Chrome Android, l'événement d'installation reste mémorisé après la
  fermeture de la bannière interne et dès le chargement initial afin que le
  bouton des réglages puisse toujours ouvrir la fenêtre native.
- Quand l'application est déjà installée, le même bloc détecte cet état et
  permet de vérifier puis d'activer la dernière version disponible.
- Sur iPhone et iPad, les réglages affichent l'instruction manuelle via le menu
  Partager quand le navigateur ne propose pas de fenêtre native.
