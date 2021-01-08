import React, {ChangeEvent, useState} from 'react';
import './ExploreContainer.css';
import {Plugins} from '@capacitor/core';
import {IonCard, IonCardContent, IonCardTitle} from "@ionic/react";

const {Storage} = Plugins;

let child: any;
let electron: any;

let miningProgram: any;
let log: string[] = [];
let setLog: any;
let isMining = false;
let setIsMining: any;
let setHashRate: any;
let maxIdle: number;

let os: any;
if (window && window.require) {
    child = window.require('child_process').execFile;
    electron = window.require('electron');
    os = window.require('os');
}

interface ContainerProps {
}

const miningDir = (e: ChangeEvent<HTMLInputElement>) => {
    Storage.set({
        key: "dir",
        value: e.target.value
    });
};

const setIdleMinutes = (e: ChangeEvent<HTMLInputElement>) => {
    Storage.set({
        key: "idle",
        value: e.target.value
    });
};

const mine = () => {
    console.log("Starting mining");
    if (miningProgram) {
        miningProgram.kill();
    }

    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            miningProgram = child(res.value, ["-P", "stratum+tls://0x21313903459f75c08d3c99980f34fc41a7ef8564." + os.hostname + "@eu1.ethermine.org:5555"], (error: any, stdout: any, stderr: any) => {
                if (error) {
                    console.error(error);
                }
                if (stderr) {
                    log.push(stderr.toString());
                    setLog(log);
                    console.log(log[log.length - 1]);
                }
                console.log(stdout);
            });
        }
    });
};

if (electron) {
    electron.ipcRenderer.on("exit", () => {
        if (miningProgram) {
            miningProgram.kill();
        }
    });
}

let TEN_MINUTES = 10 * 60 * 1000;

function checkAndRestartCrashes(split: string[]) {
    let currentTime = new Date();
    let lastMiningTime = new Date();

    let timeSplit = split[1].split(':');
    lastMiningTime.setHours(Number(timeSplit[0]));
    lastMiningTime.setMinutes(Number(timeSplit[1]));
    lastMiningTime.setSeconds(Number(timeSplit[2]));

    // @ts-ignore
    if ((currentTime - lastMiningTime) > TEN_MINUTES) {
        mine();
    }
}

const getMiningDetails = (split: string[], logLine: string, i: number) => {
    while (split[0] !== "m") {
        i--;
        if (i < 0) {
            return;
        }
        logLine = log[i];
        split = logLine.split(' ');
    }

    setHashRate(split[5]);
};

const logInspector = () => {
    setTimeout(logInspector, 10000);

    if (electron && electron.remote && electron.remote.powerMonitor) {
        const idle = electron.remote.powerMonitor.getSystemIdleTime();
        if (idle / 60 > maxIdle && !isMining) {
            isMining = true;
            setIsMining(true);
            mine();
            return;
        } else if (idle / 60 < maxIdle && isMining) {
            isMining = false;
            setIsMining(false);
            if (miningProgram) {
                console.log("Stopping mining");
                miningProgram.kill();
            }
        }
    }

    if (!isMining) {
        return;
    }

    if (log.length === 0) {
        mine();
        return;
    }

    let i = log.length - 1;
    let logLine = log[i];
    let split = logLine.split(' ');

    checkAndRestartCrashes(split);

    getMiningDetails(split, logLine, i);
};

logInspector();

const ExploreContainer: React.FC<ContainerProps> = () => {
    const [directory, setDirectory] = useState("");
    const [idleMins, setIdleMins] = useState(0);
    const [logs, setLogs] = useState([]);
    const [mining, setMining] = useState(false);
    const [hashRate, setHashRateI] = useState("");

    log = logs;
    setLog = setLogs;
    isMining = mining;
    setIsMining = setMining;
    setHashRate = setHashRateI;
    maxIdle = idleMins;

    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            setDirectory(res.value);
        }
    });

    Storage.get({key: "idle"}).then(res => {
        if (res.value !== null) {
            // @ts-ignore
            setIdleMins(res.value);
        }
    });

    return (
        <div className="container">
            <IonCard>
                <IonCardTitle>
                    Mining Software Path
                </IonCardTitle>
                <IonCardContent>
                    <p>{directory}</p>
                    <input type={"text"} onChange={miningDir}/>
                    <button onClick={() => {
                        setMining(true)
                    }}>Mine
                    </button>
                    {hashRate}
                </IonCardContent>
            </IonCard>
            <IonCard>
                <IonCardTitle>
                    Preferences
                </IonCardTitle>
                <IonCardContent>
                    Mine when idle for this many minutes
                    <input type={"number"} onChange={setIdleMinutes}/>
                    {idleMins}
                </IonCardContent>
            </IonCard>
        </div>
    );
};

export default ExploreContainer;
