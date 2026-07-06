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
- Le choix `Plus tard` masque la bannière pendant 24 heures, puis la rend de
  nouveau éligible. Les anciennes fermetures sans date sont automatiquement
  oubliées.
- Sur Chrome Android, l'événement d'installation reste mémorisé après la
  fermeture de la bannière interne et dès le chargement initial afin que le
  bouton des réglages puisse toujours ouvrir la fenêtre native.
- Le bouton des réglages attend brièvement l'événement natif si Chrome est
  encore en train d'évaluer l'installabilité. Après une désinstallation, l'état
  est resynchronisé quand la page redevient visible et quand Chrome repropose
  l'installation.
- Si Chrome ne fournit pas l'événement natif, l'interface distingue
  `Installer l'application` de `Ajouter à l'écran d'accueil`, qui peut ne créer
  qu'un raccourci selon le navigateur et l'appareil.
- Le service worker intercepte réellement les navigations et fournit une page
  de secours neutre sans connexion. Chrome peut ainsi reconnaître
  l'application comme installable au lieu d'ignorer un gestionnaire vide.
- Si la page n'est pas servie en HTTPS, les réglages expliquent directement que
  Chrome bloque l'installation dans ce contexte.
- Quand l'application est déjà installée, le même bloc détecte cet état et
  permet de vérifier puis d'activer la dernière version disponible.
- Sur iPhone et iPad, les réglages affichent l'instruction manuelle via le menu
  Partager quand le navigateur ne propose pas de fenêtre native.
