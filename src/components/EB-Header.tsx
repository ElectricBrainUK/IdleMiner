import {IonHeader, IonLabel, IonToolbar} from '@ionic/react';
import React from 'react';
import './EB-Header.css';
import {Link} from "react-router-dom";

interface HeaderProps {
    mainTitle: string,
    secondaryTitles: string[]
}

const EBHeader: React.FC<HeaderProps> = (props) => {
    const options: any = [];

    props.secondaryTitles.forEach((title: string) => {
        let clss = "eb-title";
        if (window.location.pathname === "/" + title){
           clss += " eb-bold";
        }
        options.push(
            <Link key={title} to={"/"+title} className={clss}>{title}</Link>
        );
    });

    return (
        <IonHeader>
            <IonToolbar class="toolbar">
                <IonLabel class="eb-title eb-bold">{props.mainTitle}</IonLabel>
                <div className="eb-header-divider"/>
                {options}
            </IonToolbar>
        </IonHeader>
    );
};

export default EBHeader;
