import React, {useEffect, useState} from 'react';
import './MiningPage.css';
import {Plugins} from '@capacitor/core';
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonCol,
    IonGrid,
    IonInput,
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
let protocol: string;
let pool: string;
let donate: boolean;
let donation: any;

let os: any;
if (window && window.require) {
    child = window.require('child_process').spawn;
    electron = window.require('electron');
    os = window.require('os');
}

interface ContainerProps {
}

const appendToLog = (data: string) => {
    data.toString().split("\n").forEach((line: any) => {
        if (log.length > 1000) {
            log.shift();
        }
        if (line !== "") {
            log.push(line);
        }
    });

    setLog(log);
};

const mine = (altAddress = address) => {
    Storage.get({key: "dir"}).then(res => {
        if (res.value !== null) {
            if (miningProgram && !miningProgram.killed) {
                killMiner();
            }

            console.log("Starting mining");
            miningProgram = child(res.value, ["-P", protocol + "://" + altAddress + "." + os.hostname + "@" + pool]);
            miningProgram.stderr.on('data', appendToLog);
            miningProgram.stdout.on('data', appendToLog);
        }
    }).catch(e => {
        console.log("Error starting mining");
    });
};

if (electron) {
    electron.ipcRenderer.on("exit", () => {
        if (miningProgram) {
            killMiner();
        }
    });
}

const killMiner = () => {
    console.log("Stopping mining");
    miningProgram.kill();
    const timeNow = new Date();
    log.push(" w " + timeNow.getHours() + ":" + timeNow.getMinutes() + ":" + timeNow.getSeconds() + " restarting miner");
    setLog(log);
};

let TEN_MINUTES = 10 * 60 * 1000;

function checkAndRestartCrashes(split: string[]) {
    let currentTime = new Date();
    let lastMiningTime = new Date();

    let timeSplit = split[2].split(':');
    lastMiningTime.setHours(Number(timeSplit[0]));
    lastMiningTime.setMinutes(Number(timeSplit[1]));
    lastMiningTime.setSeconds(Number(timeSplit[2]));

    // @ts-ignore
    if ((currentTime - lastMiningTime) > TEN_MINUTES) {
        console.log(log);
        console.log("Idle for more than 10 mins, restarting");
        mine();
    }
}

const getMiningDetails = (split: string[], logLine: string, i: number) => {
    while (split[1] !== "m") {
        i--;
        if (i < 0) {
            return;
        }
        logLine = log[i];
        split = logLine.split(' ');
    }

    setHashRate(split[6]);
};

let logIterations = 0;
const donateAfter = 600;
const resetEvery = 1800;
let donating = false;
let donationAddress: any = {
    default: "0x21313903459f75c08d3c99980f34fc41a7ef8564"
};

function checkDonation() {
    if (logIterations >= resetEvery) {
        logIterations = 0;
    }
    if (logIterations >= donateAfter && !donating) {
        let runningTotal = 0;
        for (let i = 0; i < Object.keys(donation).length; i++) {
            let key = Object.keys(donation)[i];
            if (logIterations < (resetEvery * (donation[key] / 10000)) + donateAfter + runningTotal) {
                donating = true;
                console.log("Mining to donation address " + key);
                mine(donationAddress[key]);
                return;
            }
            runningTotal += resetEvery * (donation[key] / 10000);
        }
    }

    donating = false;
    console.log("Mining to normal address");
    mine();
}

const logInspector = () => {
    setTimeout(logInspector, 10000);
    logIterations++;

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
                killMiner();
            }
        }
    }

    if (!isMining) {
        if (miningProgram) {
            killMiner();
        }
        return;
    }

    if (donate) {
        checkDonation();
    } else if (donating) {
        donating = false;
        console.log("Mining to normal address");
        mine();
    }

    if (log.length === 0) {
        console.log("Inactive, restarting");
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
    const [protocolI, setProtocolI] = useState("stratum+tls");
    const [donateI, setDonateI] = useState(true);
    const [donationI, setDonationI] = useState({default: 50});
    const [donationMaximum, setDonationMaximum] = useState({default: 100});
    const [newDonationName, setNewDonationName] = useState("");
    const [newDonationAddress, setNewDonationAddress] = useState("");

    log = logs;
    setLog = setLogs;
    isMining = mining;
    setIsMining = setMining;
    setHashRate = setHashRateI;
    maxIdle = idleMins;
    address = addressI;
    pool = poolI;
    protocol = protocolI;
    donate = donateI;
    donation = donationI;

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
                let donations = JSON.parse(res.value);
                if (!donations.default) {
                    return;
                }
                let donationsClone = Object.assign({}, donations);
                Object.keys(donationsClone).forEach(key => {
                    donationsClone[key] = Math.max(Math.min(donationsClone[key] * 1.5, 10000), 100);
                });
                setDonationMaximum(donationsClone);
                setDonationI(donations);
                donation = donations;
            }
        });

        Storage.get({key: "protocol"}).then(res => {
            if (res.value !== null) {
                setProtocolI(res.value);
                protocol = res.value;
            }
        });

        Storage.get({key: "addresses"}).then(res => {
            if (res.value !== null) {
                donationAddress = JSON.parse(res.value);
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

    const setDonation = (e: any, key: string) => {
        if (Number(e.detail.value) < 0) {
            return;
        }

        let clone: any = Object.assign({}, donationMaximum);
        clone[key] = Math.max(Math.min(e.detail.value * 1.5, 10000), 100);
        setDonationMaximum(clone);

        let donationClone: any = Object.assign({}, donationI);
        donationClone[key] = Number(e.detail.value);
        setDonationI(donationClone);
        donation = donationClone;
        Storage.set({
            key: "donation",
            value: JSON.stringify(donationClone)
        });
    };

    const setProtocol = (e: any) => {
        setProtocolI(e.detail.value);
        protocol = e.detail.value;
        Storage.set({
            key: "protocol",
            value: (e.detail.value).toString()
        });
    };

    const addDonationAddress = (name: string, address: string) => {
        donationAddress[name] = address;
        setDonation({detail: {value: 50}}, name);
        Storage.set({
            key: "addresses",
            value: JSON.stringify(donationAddress)
        });
    };

    const removeDonationAddress = (name: string) => {
        delete donationAddress[name];
        let clone: any = Object.assign({}, donationI);
        delete clone[name];
        setDonationI(clone);
        Storage.set({
            key: "donation",
            value: JSON.stringify(clone)
        });
        Storage.set({
            key: "addresses",
            value: JSON.stringify(donationAddress)
        });
    };

    let donations: any = [];
    Object.keys(donationI).forEach((key: string) => {
        // @ts-ignore
        let donationMaximumElement = donationMaximum[key];
        // @ts-ignore
        let donationIElement = donationI[key];
        donations.push(<IonCol key={key}>
            <IonRow>
                <IonRange min={0} max={Number(donationMaximumElement.toFixed(2))}
                          value={donationIElement} color="secondary"
                          onIonChange={(e: any) => {
                              if (e.detail.value !== Number(donationIElement)) {
                                  setDonation(e, key);
                              }
                          }}>
                    <IonLabel slot="start">0</IonLabel>
                    <IonLabel
                        slot="end">{(donationMaximumElement / 100).toFixed(2)}</IonLabel>
                </IonRange>
            </IonRow>
            <IonRow>
                <IonInput type={"text"} value={donationIElement / 100}
                          onIonChange={(e: any) => {
                              if (e && e.detail && e.detail.value && Number(e.detail.value) !== donationIElement / 100) {
                                  e.detail.value *= 100;
                                  setDonation(e, key);
                              }
                          }}/>
            </IonRow>
            <IonRow>
                <IonItem>
                    <IonLabel>{key}</IonLabel>
                    <br/>
                    {donationAddress[key]}
                </IonItem>
            </IonRow>
            {
                key !== "default" ?
                    <IonRow>
                        <IonButton onClick={() => {
                            removeDonationAddress(key)
                        }}>Remove</IonButton>
                    </IonRow>
                    :
                    <></>
            }
        </IonCol>);
    });

    donations.push(
        <IonCol key={"newDonation"}>
            <IonRow>
                New Donation
            </IonRow>
            <IonRow>
                <IonItem>
                    <IonLabel>Name</IonLabel>
                    <IonInput type={"text"} onIonChange={(e: any) => {
                        setNewDonationName(e.detail.value);
                    }}/>
                </IonItem>
                <IonItem>
                    <IonLabel>Address</IonLabel>
                    <IonInput type={"text"} onIonChange={(e: any) => {
                        setNewDonationAddress(e.detail.value);
                    }}/>
                </IonItem>
                <IonButton onClick={() => {
                    if (newDonationAddress !== "" && newDonationName !== "" && newDonationAddress.substring(0, 2) === "0x" && newDonationAddress.length === donationAddress.default.length) {
                        addDonationAddress(newDonationName, newDonationAddress);
                    } else {
                        alert("Invalid Address");
                    }
                }}>Add</IonButton>
            </IonRow>
        </IonCol>);

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
                        <IonButton onClick={() => {
                            setMining(true)
                        }}>Mine
                        </IonButton>
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
                        <IonLabel>Protocol</IonLabel>
                        <IonInput type={"text"} onIonChange={setProtocol}/>
                    </IonItem>
                    {protocolI}
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
                                                donations
                                                :
                                                <></>
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
