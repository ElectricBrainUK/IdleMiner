# Idle Miner
Idle Miner is a wrapper for mining software. Currently only EthMiner (https://github.com/ethereum-mining/ethminer) is supported but support for Claymore and others will come soon. 

It allows you to add a bit of intelligence to your mining. 

# Features
**Idle Mining** - This allows you to trigger mining after a certain amount of time with the system idle, it will also automatically stop mining once you become active. This can be disabled so that mining is only triggered manually or by another method. Or you can set the wait time to 0, so that usings the machine does not stop mining.

**MQTT** - The software will connect to an mqtt broker if you specify the connection details, this enables several features:
- Auto discovery and control of other miners connected to the same broker. Control all of your miners from any of your miners
- Control of miners via mqtt simply send an mqtt message to /idleminer/hostname/mine with the payload of true or false to start or stop mining. Where hostname is the hostname of the miner you would like to control
- Home Assistant integration - allows the miner to be monitored or controlled in homeassistant, if you set the base topic to the autodiscovery topic of your home assistant instance with autodiscovery enabled it will automatically create a switch to control the miner. 

**Start on Boot** - An option to start the software with the boot of the operating system means that even if the host crashes mining can resume automatically 

**Crash Detection** - The idle miner observes the log and if a crash is detected the mining software is automatically restarted. 

**Donation** - this allows you to donate mining time to particular addresses, ours (0x21313903459f75c08d3c99980f34fc41a7ef8564) is **included by default at 0.5%** but you can of course disbale or change the donation amount. You can then add other addresses, like Andrea Lanfranchi one of the main developers of ethminer (0xa7e593bde6b5900262cf94e4d75fb040f7ff4727) and choose a percentage of your mining time to donate, there are many great causes you can donate your mining power to. If you're not into this then that is no problem, donation can be disabled all together. 

# Set Up
- Download the latest from our releases: https://github.com/ElectricBrainUK/IdleMiner/releases 
- If you havent already download mining software: https://github.com/ethereum-mining/ethminer/releases
- You must enter the path of your mining software in the settings (e.g. C:/User/Will/Desktop/ethminer.exe) under software path. 
- You should then enter your Ethereum address under address. 
- Under Pool you add your pool address including the port (e.g. eu1.ethermine.org:5555)
- Add the protocol under the protocol section (e.g. stratum+tls)
- Choose whether or not to support us via donation

# Screens


