import React from 'react';
import './ExploreContainer.css';
let child = require('child_process').execFile;
let executablePath = "../ETHMINER/ethminer.exe";

interface ContainerProps { }

child(executablePath, function(err: any, data: any) {
    if(err){
        console.error(err);
        return;
    }

    console.log(data.toString());
});

const ExploreContainer: React.FC<ContainerProps> = () => {
  return (
    <div className="container">
      <strong>Ready to create an app?!!!!!</strong>
      <p>Start with Ioni@c <a target="_blank" rel="noopener noreferrer" href="https://ionicframework.com/docs/components">UI Components</a></p>
    </div>
  );
};

export default ExploreContainer;
