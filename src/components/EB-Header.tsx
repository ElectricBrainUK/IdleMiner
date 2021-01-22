import {IonButton, IonHeader, IonImg, IonLabel, IonToolbar} from '@ionic/react';
import React from 'react';
import './EB-Header.css';

interface HeaderProps {
    mainTitle: string,
    secondaryTitles: string[],
    selected?: number,
    onClick: any,
    minimise?: any,
    exit?: any,
    webBrowser: boolean
}

const EBHeader: React.FC<HeaderProps> = (props) => {
    const options: any = [];

    props.secondaryTitles.forEach((title: string, i: number) => {
        options.push(
            <IonLabel onClick={() => props.onClick(i)} key={title}
                      className={"eb-title" + (i === props.selected ? " eb-bold" : "")}>{title}</IonLabel>
        );
    });

    return (
        <IonHeader>
            <IonToolbar class="toolbar">
                <IonLabel class="eb-title eb-bold regular-cursor">{props.mainTitle}</IonLabel>
                <div className="eb-header-divider"/>
                {options}

                {props.webBrowser ?
                    <></>
                    :
                    <>
                        <IonButton slot="secondary" style={{width: "80px", height: "80px"}} fill={"clear"}
                                   onClick={props.minimise}>
                            <div style={{height: 8, width: 35, backgroundColor: "white", marginTop: "30px"}}/>
                        </IonButton>
                        <IonButton slot="secondary" style={{marginLeft: 0, width: "80px", height: "80px"}}
                                   fill={"clear"} onClick={props.exit}>
                            <IonImg style={{width: "40px", height: "80%"}} src={"assets/img/x-8x-white.png"}/>
                        </IonButton>
                    </>
                }
            </IonToolbar>
        </IonHeader>
    );
};

EBHeader.defaultProps = {
    selected: 0
};

export default EBHeader;
