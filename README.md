# VisioMap

Ce projet permet d'afficher la position des utilisateurs en temps réel, de réaliser des appels de visioconférence entre eux et d'afficher leurs données d'accélération.

## Table des Matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation et Parcours Utilisateur](#utilisation-et-parcours-utilisateur)
- [Limites & Pistes d'amélioration](#limites--pistes-damélioration)
- [Architecture du Projet](#architecture-du-projet)
- [Technologies Utilisées](#technologies-utilisées)

## Prérequis

- **Fichier `.env`** :

  - Obtenez une clé API MapBox.
  - Définissez le port sur lequel le serveur sera exécuté.

- **Déploiement sur VPS** :
  - Obtenez un certificat SSL valide.
  - Ouvrez le port défini dans votre fichier `.env`.

## Installation

1. **Cloner le repository**

   ```bash
   git clone https://github.com/Lyot7/visiomap.git
   ```

2. **Se placer dans le dossier du projet**

   ```bash
   cd visiomap
   ```

3. **Installer les dépendances**

   ```bash
   npm install
   ```

4. **Construire le projet**

   ```bash
   npm run build
   ```

5. **Lancer l'application**

   ```bash
   npx serve@latest out
   ```

6. **Démarrer le serveur**  
   Dans un autre terminal, lancez :

   ```bash
   node src/server/server.js
   ```

7. **Se connecter à l'application**  
   Utilisez le lien fourni par la commande `npx serve@latest out`.

## Utilisation et Parcours Utilisateur

- **Connexion**  
  Lors de la connexion, l'application vous demandera :

  - **Géolocalisation** :
    - _Oui_ : Votre position initiale sera utilisée sur la carte.
    - _Non_ : Vos coordonnées par défaut seront (0, 0).
  - **Nom d'utilisateur** :
    - Si vous saisissez un nom, il sera affiché dans la liste des utilisateurs.
    - Sinon, "Anonymous" sera utilisé par défaut.

- **Affichage de la carte**  
  La carte affiche en temps réel la position de chaque utilisateur.

- **Accélération**

  - Si votre accéléromètre est activé, les données d'accélération sont affichées en direct dans l'interface ainsi que dans la liste d'utilisateurs.
  - Sinon, vous pouvez demander la permission via le bouton **"Request permission"**.

- **Appels Vidéo**
  - Pour appeler un utilisateur, cliquez sur le bouton **"Appeler"**.
  - L'utilisateur appelé recevra une notification avec les options **Accepter** ou **Refuser** l'appel.
  - En cas d'acceptation, l'accès au micro et à la caméra est demandé pour lancer la visioconférence.
  - Pendant l'appel, vous pouvez terminer la communication en cliquant sur **"Raccrocher"**.

## Limites & Pistes d'amélioration

- **Limites**

  - La géolocalisation fonctionne bien sur Firefox et sur certains navigateurs mobiles, mais n'est pas toujours supportée sur d'autres navigateurs (exemple : Chrome et navigateurs basés sur Chromium).
  - En cas de forte affluence d'utilisateurs, le nombre d'appels au serveur pour l'accéléromètre pourrait être trop important. Il serait pertinent de mettre en place un mécanisme de limitation ou de mise en cache.
  - L'application ne dispose pas d'un système de messagerie, les utilisateurs ne pouvant pas échanger de messages entre eux.

## Architecture du Projet

Le projet est structuré de la manière suivante :

- **src/app**  
  Le point d'entrée de l'application. Le fichier `page.tsx` sert d'index et intègre les composants et hooks nécessaires.

- **src/components**  
  Contient tous les composants UI permettant de gérer et d'afficher les données.

- **src/hooks**  
  Contient les hooks personnalisés (ex. : gestion de l'accéléromètre, WebSocket, etc.) pour récupérer et traiter les données sans fournir directement d'affichage.

- **src/server**  
  Gère la communication côté serveur, notamment la connexion WebSocket, la gestion des utilisateurs et leurs données.

- **out**  
  Contient le build de l'application.

## Technologies Utilisées

- **Next.js & React**  
  Pour la gestion des composants et des états, et la mise à jour en temps réel de l'interface.

- **TypeScript**  
  Pour une meilleure robustesse et gestion des types dans le code.

- **Tailwind CSS**  
  Utilisé pour la conception rapide et efficace de l'interface.

- **Node.js**  
  Pour le serveur, la gestion des WebSocket et les connexions entre utilisateurs.

- **MapBox API**  
  Pour afficher une carte interactive et positionner les utilisateurs grâce à l'ajout de layers.

- **WebRTC**  
  Pour établir des appels de visioconférence directement entre utilisateurs via le serveur agissant comme relais.

- **DeviceMotionEvent**  
  Pour récupérer les données d'accélération (qui indiquent l'accélération, pas directement la vitesse), et les traiter pour afficher une vitesse calculée.
