import React, {ChangeEvent, useEffect, useState} from 'react';
import './MiningPage.css';
import {Plugins} from '@capacitor/core';
import {
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonCol, IonGrid, IonInput,
    IonItem,
    IonLabel,
    IonRange,
    IonRow,
    IonToggle
} from "@ionic/react";

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
let address: string;
let pool: string;
let donate: boolean;
let donation: number;

let os: any;
if (window && window.require) {
    child = window.require('child_process').execFile;
    electron = window.require('electron');
    os = window.require('os');
}

interface ContainerProps {
}

const mine = () => {
    console.log("Starting mining");
    if (miningProgram) {
        miningProgram.kill();
    }

    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            miningProgram = child(res.value, ["-P", "stratum+tls://" + address + "." + os.hostname + "@" + pool], (error: any, stdout: any, stderr: any) => {
                if (error) {
                    console.error(error);
                }
                if (stderr) {
                    if (log.length > 1000) {
                        log.pop();
                    }
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
    console.log(split);
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

const MiningPage: React.FC<ContainerProps> = () => {
    const [directory, setDirectory] = useState("");
    const [idleMins, setIdleMins] = useState(0);
    const [logs, setLogs] = useState([]);
    const [mining, setMining] = useState(false);
    const [hashRate, setHashRateI] = useState("");
    const [addressI, setAddressI] = useState("0x21313903459f75c08d3c99980f34fc41a7ef8564");
    const [poolI, setPoolI] = useState("eu1.ethermine.org:5555");
    const [donateI, setDonateI] = useState(true);
    const [donationI, setDonationI] = useState(0.5);
    const [donationMaximum, setDonationMaximum] = useState(1);

    log = logs;
    setLog = setLogs;
    isMining = mining;
    setIsMining = setMining;
    setHashRate = setHashRateI;
    maxIdle = idleMins;

    useEffect(() => {
        Storage.get({key: "dir"}).then(res => {
            if (res.value !== null) {
                setDirectory(res.value);
            }
        });

        Storage.get({key: "idle"}).then(res => {
            if (res.value !== null) {
                setIdleMins(Number(res.value));
                maxIdle = Number(res.value);
            }
        });

        Storage.get({key: "address"}).then(res => {
            if (res.value !== null) {
                setAddressI(res.value);
                address = res.value;
            }
        });

        Storage.get({key: "pool"}).then(res => {
            if (res.value !== null) {
                setPoolI(res.value);
                pool = res.value;
            }
        });

        Storage.get({key: "donate"}).then(res => {
            if (res.value !== null) {
                donate = res.value === "true";
                setDonateI(res.value === "true");
            }
        });

        Storage.get({key: "donation"}).then(res => {
            if (res.value !== null) {
                setDonationMaximum(Math.max(Math.min(Number(res.value) * 1.5, 10000), 100));
                setDonationI(Number(res.value));
                donation = Number(res.value);
            }
        });
    }, []);

    const setDir = (e: any) => {
        setDirectory(e.detail.value);
        Storage.set({
            key: "dir",
            value: e.detail.value
        });
    };

    const setIdleMinutes = (e: any) => {
        setIdleMins(Number(e.detail.value));
        maxIdle = Number(e.detail.value);
        Storage.set({
            key: "idle",
            value: e.detail.value
        });
    };

    const setAddress = (e: any) => {
        setAddressI(e.detail.value);
        address = e.detail.value;
        Storage.set({
            key: "address",
            value: e.detail.value
        });
    };

    const setPool = (e: any) => {
        setPoolI(e.detail.value);
        pool = e.detail.value;
        Storage.set({
            key: "pool",
            value: e.detail.value
        });
    };

    const setDonate = (e: any) => {
        if (e.detail) {
            donate = e.detail.checked;
            setDonateI(e.detail.checked);
            Storage.set({
                key: "donate",
                value: e.detail.checked
            });
        }
    };

    const setDonation = (e: any) => {
        setDonationMaximum(Math.max(Math.min(donationI * 1.5, 10000), 100));
        setDonationI(e.detail.value);
        donation = e;
        Storage.set({
            key: "donation",
            value: (e.detail.value).toString()
        });
    };

    // @ts-ignore
    return (
        <div className="container">
            <IonCard>
                <IonCardTitle>
                    Mining Software Path
                </IonCardTitle>
                <IonCardContent>
                    <IonItem>
                        <IonLabel>{directory}</IonLabel>
                        <IonInput type={"text"} onIonChange={setDir}/>
                        <button onClick={() => {
                            setMining(true)
                        }}>Mine
                        </button>
                    </IonItem>
                    {hashRate}
                </IonCardContent>
            </IonCard>
            <IonCard>
                <IonCardTitle>
                    Preferences
                </IonCardTitle>
                <IonCardContent>
                    <IonItem>
                        <IonLabel>Mine when idle for this many minutes</IonLabel>
                        <IonInput type={"number"} onIonChange={setIdleMinutes}/>
                    </IonItem>
                    {idleMins}
                    <IonItem>
                        <IonLabel>Address</IonLabel>
                        <IonInput type={"text"} onIonChange={setAddress}/>
                    </IonItem>
                    {addressI}
                    <IonItem>
                        <IonLabel>Pool</IonLabel>
                        <IonInput type={"text"} onIonChange={setPool}/>
                    </IonItem>
                    {poolI}
                    <IonItem>
                        <IonLabel>Donate {donateI}</IonLabel>
                        <IonGrid>
                            <IonRow>
                                <IonCol>
                                    <IonToggle checked={donateI} onIonChange={setDonate}/>
                                </IonCol>
                                <IonCol>
                                    <IonRow>
                                        {
                                            donateI ?
                                                <IonCol>
                                                    <IonRow>
                                                        <IonRange min={0} max={Number(donationMaximum.toFixed(2))}
                                                                  value={donationI} color="secondary"
                                                                  onIonChange={(e: any) => {
                                                                      if (e.detail.value !== Number(donationI)) {
                                                                          setDonation(e)
                                                                      }
                                                                  }}>
                                                            <IonLabel slot="start">0</IonLabel>
                                                            <IonLabel
                                                                slot="end">{(donationMaximum / 100).toFixed(2)}</IonLabel>
                                                        </IonRange>
                                                    </IonRow>
                                                    <IonRow>
                                                        <IonInput type={"text"} value={donationI / 100}
                                                                  onIonChange={(e: any) => {
                                                                      if (e && e.detail && e.detail.value && Number(e.detail.value) !== donationI / 100) {
                                                                          e.detail.value *= 100;
                                                                          setDonation(e);
                                                                      }
                                                                  }}/>
                                                    </IonRow>
                                                </IonCol>
                                                : <></>
                                        }
                                    </IonRow>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                    </IonItem>
                </IonCardContent>
            </IonCard>
        </div>
    );
};

export default MiningPage;
