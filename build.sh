#!/usr/bin/env bash

UUID=$(date +%s)-$(uuidgen)

function update_base_images () {
    echo -e "Updating Docker images..."
    docker images | awk '{print $1":"$2}' | grep -v 'none' | grep -iv 'repo' | grep -iv 'nps' | grep -iv 'r-script' | xargs -n1 docker pull
}

function dev () {
    # Build dev
    echo -e "*** Building DEV Environment... ***"

    update_base_images
    
    docker-compose up -d --build --force-recreate ganache || exit 1
    
    echo -e "*** Deploying contracts for backend service... *** "
    
    cd human-protocol-backend
    npm install

    cd ..
    cd human-protocol-contracts
    npm install
    npx hardhat run scripts/deploy.js --network localhost


    echo -e "Done!"
    exit 0;
}

cd "$(dirname "$0")" || exit 1

dev
exit 0;