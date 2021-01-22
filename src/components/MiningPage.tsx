import React, {useEffect, useState} from 'react';
import './MiningPage.css';
import {Plugins} from '@capacitor/core';
import {
    getPlatforms,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonContent,
    IonPage,
    IonRow
} from "@ionic/react";
import EBSettingsTextInput from "./EB-Settings-Text-Input";
import EBSettingsBooleanInput from "./EB-Settings-Boolean-Input";
import EBSettingsNumInput from "./EB-Settings-Num-Input";
import EBSettingsDoubleTextInput from "./EB-Settings-Double-Text-Input";
import EBSettingsDonationInput from "./EB-Settings-Donation-Input";
import EBSettingsSupportUs from "./EB-Settings-Support-Us";
import EBHeader from "./EB-Header";
import EBSettingsInfo from "./EB-Settings-Info";

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
let setHashRateUnit: any;
let hashRateUnit: string;
let maxIdle: number;
let address: string;
let protocol: string;
let pool: string;
let donate: boolean[];
let donation: any;
let baseTopic: string;
let miningDisabled: boolean;
let otherHosts: any = {};
let setOthers: any;
let hostName = "";
let manuallTriggeredMining = false;
let mineIdle: boolean;
const platforms = getPlatforms();
const webBrowser = platforms.includes("desktop") && !platforms.includes("electron");

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
} else {
    mqttModule = require('mqtt');
}

let mqttClient: any;

const sendSwitchDetails = () => {
    if (mqttClient && mqttClient.connected && !webBrowser) {
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
    }
};

const connectToMqtt = (protocol: string, broker: string, username: string, password: string, port: string, selfSigned: boolean) => {
    const options: any = {
        username: username,
        password: password,
        port: port,
        host: broker,
        rejectUnauthorized: !selfSigned,
    };

    if (!webBrowser) {
        options.will = {
            topic: "idleminer/" + hostName,
            payload: JSON.stringify({
                hashRate: "0 " + (hashRateUnit ? hashRateUnit : "h"),
                isMining: false
            })
        };
    }

    if (!mqttModule) {
        return;
    }

    try {
        let protocolTemp = protocol;
        if (webBrowser) {
            protocolTemp = protocolTemp.replace("mqtt", "ws");
        }
        mqttClient = mqttModule.connect(protocolTemp + broker, options);

        mqttClient.on('connect', () => {
            mqttClient.subscribe('idleminer/#', (err: any) => {
                if (!err) {
                    if (!webBrowser) {
                        sendSwitchDetails();
                        mqttClient.publish("idleminer/" + hostName, JSON.stringify({
                            hashRate: (hashRate ? hashRate : "0") + " " + (hashRateUnit ? hashRateUnit : "h"),
                            isMining
                        }));
                    }

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
        console.log("Failed to connect to mqtt broker: " + e.message);
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
    setLog(Object.assign([], log));
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
            return children.map((p: any) => {
                return process.kill(p.PID);
            });
        });
    } catch (e) {
    }
    miningProgram.kill();
    hashRate = "0";
    setHashRate("0");
    const timeNow = new Date();
    if (!log[log.length - 1].includes(" stopping miner")) {
        log.push(" w " + timeNow.getHours() + ":" + timeNow.getMinutes() + ":" + timeNow.getSeconds() + " stopping miner");
        setLog(Object.assign([], log));
    }
    if (mqttClient && mqttClient.connected && !webBrowser) {
        mqttClient.publish("idleminer/" + hostName, JSON.stringify({
            hashRate: "0 MH",
            isMining: false
        }));
    }
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

    setHashRateUnit(split[7]);
    hashRateUnit = split[7];
};

let logIterations = 0;
const donateAfter = 180;
const resetEvery = 4320;
let donating = false;
let donatingTo = "";
let donationAddress: any = {
    default: "0x21313903459f75c08d3c99980f34fc41a7ef8564"
};

function checkDonation() {
    if (logIterations >= resetEvery) {
        logIterations = 0;
    }
    let runningTotal = 0;
    if (logIterations >= donateAfter) {
        for (let i = 0; i < Object.keys(donation).length; i++) {
            if (!donate[i]) {
                continue;
            }
            let key = Object.keys(donation)[i];
            if (logIterations < (resetEvery * (donation[key] / 100)) + donateAfter + runningTotal) {
                if (!donating || donatingTo !== key) {
                    donatingTo = key;
                    donating = true;
                    console.log("Mining to donation address " + key);
                    mine(donationAddress[key]);
                }
                return;
            }
            runningTotal += resetEvery * (donation[key] / 100);
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
    if (miningDisabled || webBrowser) {
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

    let shoudDonate = false;
    if (donate && donate.filter(check => check).length > 0) {
        shoudDonate = true;
    }
    if (shoudDonate) {
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
            hashRate: (hashRate ? hashRate : "0") + " " + (hashRateUnit ? hashRateUnit : "h"),
            isMining
        }));
    }

    let i = log.length - 1;
    let logLine = log[i];
    let split = logLine.split(' ');

    while (!split && i > 0) {
        i--;
        logLine = log[i];
        split = logLine.split(' ');
    }

    if (!split) {
        return;
    }

    checkAndRestartCrashes(split);

    getMiningDetails(split, logLine, i);
};

logInspector();

const MiningPage: React.FC<ContainerProps> = () => {
    const [directory, setDirectory] = useState("");
    const [idleMins, setIdleMins] = useState(0);
    const [logs, setLogs] = useState([]);
    const [mining, setMining] = useState(false);
    const [hashRate, setHashRateI] = useState("0");
    const [hashRateUnit, setHashRateUnitI] = useState("MH");
    const [addressI, setAddressI] = useState("0x21313903459f75c08d3c99980f34fc41a7ef8564");
    const [poolI, setPoolI] = useState("eu1.ethermine.org:5555");
    const [protocolI, setProtocolI] = useState("stratum+tls");
    const [donateI, setDonateI] = useState([]);
    const [donationI, setDonationI] = useState({default: .50});
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
    const [onPage, setOnPage] = useState(0);
    const [viewFullLog, setViewFullLog] = useState(false);

    const enabledCss = "container";
    const disabledCss = "container invisible";

    log = logs;
    setLog = setLogs;
    isMining = mining;
    setIsMining = setMining;
    setHashRate = setHashRateI;
    setHashRateUnit = setHashRateUnitI;
    maxIdle = idleMins;
    address = addressI;
    pool = poolI;
    protocol = protocolI;
    donate = donateI;
    donation = donationI;
    baseTopic = mqttBaseTopic;
    setOthers = (hosts: any) => {
        setOtherHosts(hosts);
        Storage.set({key: "knownHosts", value: JSON.stringify(hosts)});
    };
    mineIdle = mineIdleI;

    useEffect(() => {
        Storage.get({key: "dir"}).then(res => {
            if (res.value !== null) {
                setDirectory(res.value);
            }
        });

        Storage.get({key: "knownHosts"}).then(res => {
            if (res.value !== null) {
                setOtherHosts(JSON.parse(res.value));
                otherHosts = JSON.parse(res.value);
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
                donate = JSON.parse(res.value);
                setDonateI(JSON.parse(res.value));
            }
        });

        Storage.get({key: "donation"}).then(res => {
            if (res.value !== null) {
                let donations = JSON.parse(res.value);
                if (!donations.default) {
                    return;
                }
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

    const setPage = (i: number) => {
        setOnPage(i);
    };
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

    const setDonate = (e: any, position: number) => {
        if (e.detail) {
            donate[position] = e.detail.checked;
            // @ts-ignore
            setDonateI(donate);
            Storage.set({
                key: "donate",
                value: JSON.stringify(donate)
            });
        }
    };

    const setDonation = (e: any, key: string) => {
        if (Number(e.detail.value) < 0) {
            return;
        }

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
        setDonation({detail: {value: .5}}, name);
        Storage.set({
            key: "addresses",
            value: JSON.stringify(donationAddress)
        });
    };

    const removeDonationAddress = (name: string, index: number) => {
        delete donationAddress[name];
        let clone: any = Object.assign({}, donationI);
        delete clone[name];
        setDonationI(clone);

        let clone2: any = Object.assign([], donateI);
        clone2.splice(index, 1);
        setDonateI(clone2)
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

    const setStartMining = (e: any) => {
        miningDisabled = false;
        if (e.detail) {
            manuallTriggeredMining = e.detail.checked;
            setMining(e.detail.checked);
            isMining = e.detail.checked;
            if (!e.detail.checked) {
                killMiner();
            }
        }
    };

    const setStartOnBoot = (e: any) => {
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
    };

    const setNewAddress = () => {
        if (newDonationAddress !== "" && newDonationName !== "" && newDonationAddress.substring(0, 2) === "0x" && newDonationAddress.length === donationAddress.default.length) {
            addDonationAddress(newDonationName, newDonationAddress);
        } else {
            alert("Invalid Address");
        }
    };

    let donations: any = [];
    Object.keys(donationI).forEach((key: string, i: number) => {
        // @ts-ignore
        let donationIElement = donationI[key];
        donations.push(
            <IonRow key={key}>

                {
                    key !== "default" ?
                        <>
                            <EBSettingsDonationInput label={key} placeholderBool={donate[i]} onChangeBool={(e: any) => {
                                setDonate(e, i)
                            }} submit={() => {
                                removeDonationAddress(key, i)
                            }} placeholderNum={donationIElement} onChangeNum={(e: any) => {
                                if (e && e.detail && e.detail.value && Number(e.detail.value) !== donationIElement) {
                                    setDonation(e, key);
                                }
                            }} min={"0"} max={"100"} infoLabel={donationAddress[key]}/>
                        </>
                        :
                        <>
                            <EBSettingsSupportUs label={"Support Us"} placeholderBool={donateI[i]}
                                                 placeholderNum={donationIElement}
                                                 onChangeBool={(e: any) => setDonate(e, i)} onChangeNum={(e: any) => {
                                if (e && e.detail && e.detail.value && Number(e.detail.value) !== donationIElement) {
                                    setDonation(e, key);
                                }
                            }}/>
                        </>
                }

            </IonRow>);
    });

    donations.push(
        <EBSettingsDoubleTextInput key={"newDonation"} label={"New Donation"} submit={setNewAddress}
                                   placeholder2={"Address"} onChange2={(e: any) => {
            setNewDonationAddress(e.detail.value);
        }}
                                   placeholder1={"Name"} onChange1={(e: any) => {
            setNewDonationName(e.detail.value);
        }}/>);

    let others: any = [];
    Object.keys(mqttOtherHosts).forEach(hostName => {
        // @ts-ignore
        let mqttOtherHost = mqttOtherHosts[hostName];
        others.push(
            <EBSettingsBooleanInput label={hostName} placeholder={mqttOtherHost.isMining} onChange={(e: any) => {
                mqttClient.publish("idleminer/" + hostName + "/mine", JSON.stringify(e.detail.checked));
                let temp: any = Object.assign({}, mqttOtherHosts);
                temp[hostName].isMining = e.detail.checked;
                setOtherHosts(temp);
            }} secondaryLabel={mqttOtherHost.hashRate + "/s"} key={hostName}/>
        )
    });
    let logDisplay: any = [];
    logs.slice(viewFullLog ? 0 : Math.max(logs.length - 10, 0)).forEach((logLine: string) => {
        logDisplay.push(
            <EBSettingsInfo label={logLine}/>
        );
    });

    const exitApp = () => {
        if (electron) {
            electron.ipcRenderer.send("closeApp");
        }
    };

    const minimiseApp = () => {
        if (electron) {
            electron.ipcRenderer.send("minimiseApp");
        }
    };

    return (
        <IonPage>
            <EBHeader mainTitle={"Mine"} onClick={setPage} selected={onPage}
                      secondaryTitles={["Dashboard", "Settings"]}
                      minimise={minimiseApp} exit={exitApp} webBrowser={webBrowser}/>
            <IonContent>
                <div className={"centre"}>
                    <div className={onPage !== 0 ? enabledCss : disabledCss}>
                        <IonCard className={webBrowser ? disabledCss : enabledCss}>
                            <IonCardTitle>
                                Mining
                            </IonCardTitle>
                            <IonCardContent>
                                <EBSettingsTextInput label={"Software Path"} placeholder={directory}
                                                     onChange={setDir}/>
                                <EBSettingsTextInput label={"Address"} placeholder={addressI}
                                                     onChange={setAddress}/>
                                <EBSettingsTextInput label={"Pool"} placeholder={poolI} onChange={setPool}/>
                                <EBSettingsTextInput label={"Protocol"} placeholder={protocolI}
                                                     onChange={setProtocol}/>
                            </IonCardContent>
                        </IonCard>
                        <IonCard className={webBrowser ? disabledCss : enabledCss}>
                            <IonCardTitle>
                                Preferences
                            </IonCardTitle>
                            <IonCardContent>
                                <EBSettingsBooleanInput label={"Enable Idle Mining"} placeholder={mineIdleI}
                                                        onChange={setMineIdle}/>
                                <EBSettingsNumInput label={"Idle Mining Delay"} placeholder={idleMins.toString()}
                                                    onChange={setIdleMinutes} unit={"minutes"} min={"0"}/>
                                <EBSettingsBooleanInput label={"Start On Boot"} placeholder={autoStart}
                                                        onChange={setStartOnBoot}/>
                            </IonCardContent>
                        </IonCard>
                        <IonCard className={webBrowser ? disabledCss : enabledCss}>
                            <IonCardTitle>
                                Donations
                            </IonCardTitle>
                            <IonCardContent>
                                {donations}
                            </IonCardContent>
                        </IonCard>
                        <IonCard>
                            <IonCardTitle>
                                MQTT
                                <div style={{display: "inline-block", width: "700px", flexShrink: 1}}/>
                                <IonButton style={{fontSize: "16px"}} onClick={sendSwitchDetails}>Refresh
                                    MQTT</IonButton>
                                {
                                    webBrowser ?
                                        <p>Only websocket protocols and ports are supported in a web browser</p>
                                        :
                                        <></>
                                }
                            </IonCardTitle>
                            <IonCardContent>
                                <EBSettingsBooleanInput label={"Enabled MQTT"} placeholder={mqtt}
                                                        onChange={setMQTT}/>
                                <EBSettingsTextInput label={"Protocol"} placeholder={mqttProtocol}
                                                     onChange={setMQTTProtocol}/>
                                <EBSettingsTextInput label={"Broker"} placeholder={mqttBroker}
                                                     onChange={setMQTTBroker}/>
                                <EBSettingsTextInput label={"Port"} placeholder={mqttPort} type="number"
                                                     onChange={setMQTTPort}/>
                                <EBSettingsTextInput label={"Base Topic"} placeholder={mqttBaseTopic}
                                                     onChange={setMQTTBaseTopic}/>
                                <EBSettingsBooleanInput label={"Self Signed Certificate"}
                                                        placeholder={mqttSelfSigned} onChange={setMQTTSelfSigned}/>
                                <EBSettingsTextInput label={"Username"} placeholder={mqttUsername}
                                                     onChange={setMQTTUsername}/>
                                <EBSettingsTextInput label={"Password"} type="password" onChange={setMQTTPassword}/>

                            </IonCardContent>
                        </IonCard>
                    </div>
                    <div className={onPage === 0 ? enabledCss : disabledCss}>
                        {!viewFullLog ?
                            <>
                                {!mining ?
                                    <IonButton style={{fontSize: "16px"}} onClick={() => {
                                        miningDisabled = false;
                                        manuallTriggeredMining = true;
                                        setMining(true);
                                    }} className={webBrowser ? disabledCss : enabledCss}>
                                        Start Mining
                                    </IonButton>
                                    :
                                    <IonButton style={{fontSize: "16px"}} onClick={() => {
                                        miningDisabled = false;
                                        manuallTriggeredMining = false;
                                        setMining(false);
                                    }} className={webBrowser ? disabledCss : enabledCss}>
                                        Stop Mining
                                    </IonButton>
                                }

                                <IonCard>
                                    <IonCardTitle>
                                        Hosts
                                    </IonCardTitle>
                                    <IonCardContent>
                                        {webBrowser ? <></> :
                                            <EBSettingsBooleanInput label={"This Machine"} placeholder={mining}
                                                                    onChange={setStartMining}
                                                                    secondaryLabel={hashRate + " " + hashRateUnit + "/s"}/>
                                        }
                                        {others}
                                    </IonCardContent>
                                </IonCard>
                            </>
                            :
                            <></>
                        }
                        <IonCard className={webBrowser ? disabledCss : enabledCss}>
                            <IonCardTitle>
                                Log
                                <div style={{display: "inline-block", width: "600px", flexGrow: 1}}/>
                                <IonButton style={{fontSize: "16px"}} onClick={() => {
                                    setViewFullLog(!viewFullLog)
                                }}>
                                    {viewFullLog ? "Hide" : "Show Full Log"}
                                </IonButton>
                            </IonCardTitle>
                            <IonCardContent>
                                {logDisplay}
                            </IonCardContent>
                        </IonCard>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default MiningPage;
