import React, {ChangeEvent, useState} from 'react';
import './ExploreContainer.css';
import {Plugins} from '@capacitor/core';

const {Storage} = Plugins;

let child = window.require('child_process').spawn;

interface ContainerProps {
}

const miningDir = (e: ChangeEvent<HTMLInputElement>) => {
    Storage.set({
        key: "dir",
        value: e.target.value
    });
};

const mine = () => {
    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            const miner = child("cmd.exe");
            miner.stdout.on('data', (data: any) => {
                console.log(data.toString());
                if (data.toString().includes("All rights reserved.")) {
                    console.log("writing");
                    miner.stdin.write(res.value + " -P stratum+tls://0x21313903459f75c08d3c99980f34fc41a7ef8564.%ComputerName%@eu1.ethermine.org:5555 \n")
                } else {
                    console.log("no write");
                }
            });

            miner.stderr.on('data', (data: any) => {
                console.error(data.toString());
            });

            miner.on('exit', (code: any) => {
                console.log(`Child exited with code ${code}`);
            });
        }
    });
};

const ExploreContainer: React.FC<ContainerProps> = () => {
    const [directory, setDirectory] = useState("");

    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            setDirectory(res.value);
        }
    });

    return (
        <div className="container">
            <p>{directory}</p>
            <input type={"text"} onChange={miningDir}/>
            <button onClick={mine}>Mine</button>
        </div>
    );
};

export default ExploreContainer;
