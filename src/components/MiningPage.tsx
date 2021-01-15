import React, {useEffect, useState} from 'react';
import './MiningPage.css';
import {Plugins} from '@capacitor/core';
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonCol,
    IonContent,
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
let hashRate: string;
let maxIdle: number;
let address: string;
let protocol: string;
let pool: string;
let donate: boolean;
let donation: any;
let baseTopic: string;
let miningDisabled: boolean;
let otherHosts: any = {};
let setOthers: any;
let hostName = "";
let manuallTriggeredMining = false;
let mineIdle: boolean;

let os: any;
let mqttModule: any;
let psTree = require('ps-tree');
if (window && window.require) {
    child = window.require('child_process').spawn;
    electron = window.require('electron');
    os = window.require('os');
    mqttModule = window.require('mqtt');
    let string = "" + os.hostname;
    hostName = string.split('.')[0];
}

let mqttClient: any;

const connectToMqtt = (protocol: string, broker: string, username: string, password: string, port: string, selfSigned: boolean) => {
    const options: any = {
        username: username,
        password: password,
        port: port,
        host: broker,
        rejectUnauthorized: !selfSigned,
        will: {
            topic: "idleminer/" + hostName,
            payload: JSON.stringify({
                hashRate: "0",
                isMining: false
            })
        }
    };


    if (!mqttModule) {
        return;
    }

    try {
        mqttClient = mqttModule.connect(protocol + broker, options);

        mqttClient.on('connect', () => {
            mqttClient.subscribe('idleminer/#', (err: any) => {
                if (!err) {
                    mqttClient.publish(baseTopic + "/switch/" + hostName + "/config", JSON.stringify({
                        "payload_on": true,
                        "payload_off": false,
                        "json_attributes_topic": "idleminer/" + hostName,
                        "value_template": "{{ value_json.isMining }}",
                        "state_topic": "idleminer/" + hostName,
                        "name": hostName,
                        "unique_id": hostName,
                        "device": {
                            "name": hostName,
                            "identifiers": [hostName],
                            "manufacturer": "Electric Brain",
                            "model": "Miner"
                        },
                        "command_topic": "idleminer/" + hostName + "/mine"
                    }));
                    mqttClient.publish("idleminer/" + hostName, JSON.stringify({
                        hashRate,
                        isMining
                    }));

                    mqttClient.subscribe("idleminer/" + hostName + "/mine");
                }
            });
        });

        mqttClient.on("message", (topic: string, message: any) => {
            let topicParts = topic.split('/');
            if (topicParts[0] === "idleminer" && topicParts[1] !== hostName && topicParts.length === 2) {
                otherHosts[topicParts[1]] = JSON.parse(message.toString());
                setOthers(Object.assign({}, otherHosts));
            }

            if (topic === "idleminer/" + hostName + "/mine") {
                if (message.toString() === "True" || message.toString() === "true") {
                    miningDisabled = false;
                    if (!isMining) {
                        console.log("Starting mining manually");
                        setIsMining(true);
                        isMining = true;
                        manuallTriggeredMining = true;
                        mine();
                    }
                } else {
                    miningDisabled = true;
                    if (isMining) {
                        console.log("Stopping mining manually");
                        setIsMining(false);
                        isMining = false;
                        if (miningProgram) {
                            killMiner();
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.log("Faled to connect to mqtt broker: " + e.message);
    }
};

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
            miningProgram = child(res.value, ["-P", protocol + "://" + altAddress + "." + hostName + "@" + pool]);
            miningProgram.stderr.on('data', appendToLog);
            miningProgram.stdout.on('data', appendToLog);
        }
    }).catch(e => {
        console.log("Error starting mining");
    });
};

if (electron) {
    electron.ipcRenderer.on("exit", () => {
        if (mqttClient) {
            mqttClient.end();
        }

        if (miningProgram) {
            killMiner();
        }
    });
}

const killMiner = () => {
    console.log("Stopping mining");
    try {
        psTree(miningProgram.pid, (err: any, children: any) => {
            children.map((p: any) => {
                process.kill(p.PID);
            });
        });
    } catch (e) {
        console.log(e);
    }
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
    hashRate = split[6];
};

let logIterations = 0;
const donateAfter = 180;
const resetEvery = 4320;
let donating = false;
let donationAddress: any = {
    default: "0x21313903459f75c08d3c99980f34fc41a7ef8564"
};

function checkDonation() {
    if (logIterations >= resetEvery) {
        logIterations = 0;
    }
    let runningTotal = 0;
    if (logIterations >= donateAfter && !donating) {
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

    if (donating) {
        donating = false;
        console.log("Mining to normal address");
        mine();
    }
}

let lastIdle = 0;

const logInspector = () => {
    setTimeout(logInspector, 10000);
    if (miningDisabled) {
        return;
    }

    logIterations++;

    if (mineIdle && electron && electron.remote && electron.remote.powerMonitor) {
        const idle = electron.remote.powerMonitor.getSystemIdleTime();
        if (lastIdle > idle) {
            manuallTriggeredMining = false;
        }
        if (idle / 60 > maxIdle && !isMining) {
            isMining = true;
            setIsMining(true);
            mine();
            return;
        } else if (idle / 60 < maxIdle && isMining && !manuallTriggeredMining) {
            isMining = false;
            setIsMining(false);
            if (miningProgram) {
                killMiner();
            }
        }
        lastIdle = idle;
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

    if (mqttClient && mqttClient.connected) {
        mqttClient.publish("idleminer/" + hostName, JSON.stringify({
            hashRate,
            isMining
        }));
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
    const [mqtt, setMQTTi] = useState(false);
    const [mqttProtocol, setMQTTProtocoli] = useState("");
    const [mqttBroker, setMQTTBrokeri] = useState("");
    const [mqttUsername, setMQTTUsernamei] = useState("");
    const [mqttPassword, setMQTTPasswordi] = useState("");
    const [mqttPort, setMQTTPorti] = useState("");
    const [mqttSelfSigned, setMQTTSelfSignedi] = useState(false);
    const [mqttBaseTopic, setMQTTBaseTopici] = useState("");
    const [mqttOtherHosts, setOtherHosts] = useState({});
    const [autoStart, setAutoStart] = useState(false);
    const [mineIdleI, setMineIdleI] = useState(true);

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
    baseTopic = mqttBaseTopic;
    setOthers = setOtherHosts;
    mineIdle = mineIdleI;

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

        Storage.get({key: "mineIdle"}).then(res => {
            if (res.value !== null) {
                mineIdle = JSON.parse(res.value);
                setMineIdleI(JSON.parse(res.value));
            }
        });

        let mqttDetails = [];
        let mqttCheck = false;
        let values: any = {};
        mqttDetails.push(Storage.get({key: "mqtt"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                mqttCheck = value;
                setMQTTi(value);
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttBroker"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTBrokeri(value);
                values.broker = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttUsername"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTUsernamei(value);
                values.userName = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttPassword"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTPasswordi(value);
                values.password = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttPort"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTPorti(value);
                values.port = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttSelfSigned"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTSelfSignedi(value);
                values.selfSigned = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttProtocol"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTProtocoli(value);
                values.protocol = value;
            }
        }));

        mqttDetails.push(Storage.get({key: "mqttBaseTopic"}).then(res => {
            if (res.value !== null) {
                let value = JSON.parse(res.value);
                setMQTTBaseTopici(value);
                baseTopic = value;
            }
        }));

        Promise.all(mqttDetails).then(() => {
            if (mqttCheck) {
                connectToMqtt(values.protocol, values.broker, values.userName, values.password, values.port, values.selfSigned);
            }
        });

        if (electron) {
            electron.ipcRenderer.on("autoLaunchEnabled", () => {
                setAutoStart(true);
            });
            electron.ipcRenderer.on("autoLaunchDisabled", () => {
                setAutoStart(false);
            });
            electron.ipcRenderer.send("isAutoLaunch");
        }
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

    const setMQTT = (e: any) => {
        if (e.detail) {
            setMQTTi(e.detail.checked);
            Storage.set({
                key: "mqtt",
                value: JSON.stringify(e.detail.checked)
            });
        }
    };

    const setMQTTUsername = (e: any) => {
        if (e.detail) {
            setMQTTUsernamei(e.detail.value);
            Storage.set({
                key: "mqttUsername",
                value: JSON.stringify(e.detail.value)
            });
            connectToMqtt(mqttProtocol, mqttBroker, e.detail.value, mqttPassword, mqttPort, mqttSelfSigned);
        }
    };

    const setMQTTPassword = (e: any) => {
        if (e.detail) {
            setMQTTPasswordi(e.detail.value);
            Storage.set({
                key: "mqttPassword",
                value: JSON.stringify(e.detail.value)
            });
            connectToMqtt(mqttProtocol, mqttBroker, mqttUsername, e.detail.value, mqttPort, mqttSelfSigned);
        }
    };

    const setMQTTPort = (e: any) => {
        if (e.detail) {
            setMQTTPorti(e.detail.value);
            Storage.set({
                key: "mqttPort",
                value: JSON.stringify(e.detail.value)
            });
            connectToMqtt(mqttProtocol, mqttBroker, mqttUsername, mqttPassword, e.detail.value, mqttSelfSigned);
        }
    };

    const setMQTTSelfSigned = (e: any) => {
        if (e.detail) {
            setMQTTSelfSignedi(e.detail.checked);
            Storage.set({
                key: "mqttSelfSigned",
                value: JSON.stringify(e.detail.checked)
            });
            connectToMqtt(mqttProtocol, mqttBroker, mqttUsername, mqttPassword, mqttPort, e.detail.checked);
        }
    };

    const setMQTTBroker = (e: any) => {
        if (e.detail) {
            setMQTTBrokeri(e.detail.value);
            Storage.set({
                key: "mqttBroker",
                value: JSON.stringify(e.detail.value)
            });
            connectToMqtt(mqttProtocol, e.detail.value, mqttUsername, mqttPassword, mqttPort, mqttSelfSigned);
        }
    };

    const setMQTTProtocol = (e: any) => {
        if (e.detail) {
            setMQTTProtocoli(e.detail.value);
            Storage.set({
                key: "mqttProtocol",
                value: JSON.stringify(e.detail.value)
            });
            connectToMqtt(e.detail.value, mqttBroker, mqttUsername, mqttPassword, mqttPort, mqttSelfSigned);
        }
    };

    const setMQTTBaseTopic = (e: any) => {
        if (e.detail) {
            baseTopic = e.detail.value;
            setMQTTBaseTopici(e.detail.value);
            Storage.set({
                key: "mqttBaseTopic",
                value: JSON.stringify(e.detail.value)
            });
        }
    };

    const setMineIdle = (e: any) => {
        if (e.detail) {
            mineIdle = e.detail.checked;
            setMineIdleI(e.detail.checked);
            Storage.set({
                key: "mineIdle",
                value: JSON.stringify(e.detail.checked)
            });
        }
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

    let others: any = [];

    Object.keys(mqttOtherHosts).forEach(hostName => {
        // @ts-ignore
        let mqttOtherHost = mqttOtherHosts[hostName];
        others.push(
            <IonItem>
                <IonLabel>{hostName}</IonLabel>
                Hash Rate: {mqttOtherHost.hashRate}
                <IonToggle checked={mqttOtherHost.isMining}
                           onIonChange={(e) => {
                               mqttClient.publish("idleminer/" + hostName + "/mine", JSON.stringify(e.detail.checked))
                           }}/>
            </IonItem>
        )
    });

    return (
        <IonContent className="scroll-content container">
            <br/>
            <br/>
            <br/>
            <IonCard>
                <IonCardTitle>
                    Mining Software Path
                </IonCardTitle>
                <IonCardContent>
                    <IonItem>
                        <IonLabel>{directory}</IonLabel>
                        <IonInput type={"text"} onIonChange={setDir}/>
                        <IonButton onClick={() => {
                            miningDisabled = false;
                            manuallTriggeredMining = true;
                            setMining(true);
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
                        <IonLabel>Idle Mine</IonLabel>
                        <IonToggle checked={mineIdleI} onIonChange={setMineIdle}></IonToggle>
                    </IonItem>
                    {
                        mineIdleI ?
                            <>
                                <IonItem>
                                    <IonLabel>Mine when idle for this many minutes</IonLabel>
                                    <IonInput type={"number"} onIonChange={setIdleMinutes}/>
                                </IonItem>
                                {idleMins}
                            </>
                            : <></>
                    }
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
                    <IonItem>
                        <IonLabel>Start on boot</IonLabel>
                        <IonToggle checked={autoStart} onIonChange={(e) => {
                            if (e.detail.checked) {
                                if (electron) {
                                    electron.ipcRenderer.send("autoLaunchOn");
                                    setAutoStart(true);
                                }
                            } else {
                                if (electron) {
                                    electron.ipcRenderer.send("autoLaunchOff");
                                    setAutoStart(false);
                                }
                            }
                        }}/>
                    </IonItem>
                </IonCardContent>
            </IonCard>
            <IonCard>
                <IonCardTitle>
                    MQTT
                </IonCardTitle>
                <IonCardContent>
                    <IonItem>
                        <IonLabel>Enable MQTT</IonLabel>
                        <IonToggle checked={mqtt} onIonChange={setMQTT}/>
                    </IonItem>
                    {
                        mqtt ?
                            <IonRow>
                                <IonItem>
                                    <IonLabel>Protocol</IonLabel>
                                    <IonInput type={"text"} onIonChange={setMQTTProtocol}/>
                                    {mqttProtocol}
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Broker</IonLabel>
                                    <IonInput type={"text"} onIonChange={setMQTTBroker}/>
                                    {mqttBroker}
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Username</IonLabel>
                                    <IonInput type={"text"} onIonChange={setMQTTUsername}/>
                                    {mqttUsername}
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Password</IonLabel>
                                    <IonInput type={"password"} onIonChange={setMQTTPassword}/>
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Port</IonLabel>
                                    <IonInput type={"text"} onIonChange={setMQTTPort}/>
                                    {mqttPort}
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Self Signed Certificate</IonLabel>
                                    <IonToggle checked={mqttSelfSigned} onIonChange={setMQTTSelfSigned}/>
                                </IonItem>
                                <IonItem>
                                    <IonLabel>Base Topic</IonLabel>
                                    <IonInput type={"text"} onIonChange={setMQTTBaseTopic}/>
                                    {mqttBaseTopic}
                                </IonItem>
                            </IonRow>
                            :
                            <></>
                    }
                </IonCardContent>
            </IonCard>
            <IonCard>
                <IonCardTitle>
                    Other Hosts
                </IonCardTitle>
                <IonCardContent>
                    {others}
                </IonCardContent>
            </IonCard>
        </IonContent>
    );
};

export default MiningPage;
