import { useRef, useState } from 'react';
import { useMediaQuery } from 'react-responsive';

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Toolbar } from 'primereact/toolbar';
import { TabView, TabPanel } from 'primereact/tabview';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Image } from 'primereact/image';
import { Menu } from 'primereact/menu';
import { Dialog } from 'primereact/dialog';


import Markdown from "marked-react";

import { useCurrentRound, useCurrentRoundState, useRoundsHistory } from './lottery_data';
import { Entropy } from './Entropy';
import { Admin } from './Admin';
import { RoundDisplay } from './Round';
import { version } from './version';

import 'primereact/resources/themes/lara-light-blue/theme.css'; //theme
import 'primereact/resources/primereact.min.css'; //core css
import 'primeicons/primeicons.css'; //icons
import 'primeflex/primeflex.css'; // flex
import './App.css';
import LOGO from './assets/BRO_128_128.png';
import SNAIL from './assets/Bro-Sheldon-Gift.webp';
import RULES from './assets/rules.txt?raw'
import RANDOM_GEN from './assets/random.txt?raw'

const NETWORK = import.meta.env.VITE_NETWORK
const NS = import.meta.env.VITE_LOTTERY_NS

const ENDPOINT= import.meta.env.VITE_ENDPOINT;
const CHAIN = import.meta.env.VITE_CHAIN;
const BTC_ORACLE = import.meta.env.VITE_BTC_ORACLE;
const LOTTERY = import.meta.env.VITE_LOTTERY_NS + ".bro-lottery";
const HELPERS = import.meta.env.VITE_LOTTERY_NS + ".bro-lottery-helpers";
const BRO = import.meta.env.VITE_BRO_NS + ".bro";


function CurrentRoundDisplay()
{
  const rnd = useCurrentRound();
  const state = useCurrentRoundState();
  return  <Card className="border-1 border-200 " >
            <RoundDisplay round={rnd} state={state}/>
          </Card>
}

function RoundHistoryDisplay()
{
  const rounds = useRoundsHistory();
  return <Accordion activeIndex={-1}>
          {rounds.map(r =>  <AccordionTab className="p-0" key={r.id} header={`${r.start_time.toDateString()} -> ${r.end_time.toDateString()}`}>
                              <RoundDisplay round={r} state="SETTLED" hasTitle />
                            </AccordionTab>)}
        </Accordion>
}

function BuyButton()
{
  return  <>
            <Button size="large" text raised  severity="danger" className="mb-3 text-2xl font-semibold shadow-5 flipleft animation-duration-1000" onClick={() =>  window.open('https://play-lotto.bro.pink', '_blank')} > Buy a ticket (Play Lotto Dapp) </Button>
            <div className="mb-2 font-italic text-xl" >
              If you are a <a href="https://www.linxwallet.xyz/" target="_blank">Linx Wallet</a> user, you can buy a ticket directly in your Wallet. <span className="text-lg"> (small wallet's fee may apply) </span>
            </div>
          </>
}

const BAR_BUTTONS_CLASS = "w-10rem"

function SmartContractButton()
{
  const menu = useRef(null);
  const view_module = (mod) => `https://balance.chainweb.com/modules.html?server=${ENDPOINT}&module=${mod}&chain=${CHAIN}`
  const build_menu_item = ([name, mod]) => ({label:name, icon:'pi pi-file-check', target:"_blank", url:view_module(mod)});

  const items = [
        {
            label: 'Kadena modules',
            items: [['Lottery', LOTTERY], ['Lottery helpers', HELPERS], ['BTC oracle', BTC_ORACLE], ['Bro', BRO]].map(build_menu_item)
        }
    ];

    return  <div className="card flex justify-content-center m-2">
            <Menu model={items} popup ref={menu} id="popup_menu_left" />
            <Button className={BAR_BUTTONS_CLASS} size="small" text raised label="Contracts" icon="pi pi-folder-open" onClick={(event) => menu.current.toggle(event)}/>
            </div>
}


const useBoolState = value =>  { const [val, set] = useState(value)
                                 return [val, ()=>set(true), ()=>set(false)]}


function Rules()
{
  return <div className="line-height-3">
        <Markdown>{RULES}</Markdown>
        </div>
}

function RandomGen()
{
  return <div className="line-height-3">
        <Markdown>{RANDOM_GEN}</Markdown>
        </div>
}



function RulesButton()
{
  const menu = useRef(null);
  const [rulesVisible, showRules, hideRules] = useBoolState(false)
  const [randomVisible, showRandom, hideRandom] = useBoolState(false)

  const HELP_DIALOG_CLASS ="w-full md:w-9 xl:w-6"

  const items = [
        {
            label: 'Help & Rules',
            items: [{label:"Rules", icon:"pi pi-list", command:showRules},
                    {label:"Random Gen", icon:"pi pi-calculator",  command:showRandom},
                    {label:"Draw verification", icon:"pi pi-check-circle", target:"_blank", url:"https://github.com/brothers-DAO/bro-lottery/blob/main/verfiication/VERIFY.md"}]
        }
    ];

    return  <div className="card flex justify-content-center m-2">
              <Dialog className={HELP_DIALOG_CLASS} header="$BRO Supper Lotto Rules" headerClassName="text-primary-500" visible={rulesVisible} onHide={hideRules}><Rules /></Dialog>
              <Dialog className={HELP_DIALOG_CLASS} header="Random numbers generation" headerClassName="text-primary-500" visible={randomVisible} onHide={hideRandom}><RandomGen /></Dialog>
              <Menu model={items} popup ref={menu} id="popup_menu_left" />
              <Button className={BAR_BUTTONS_CLASS} size="small" text raised label="Help & Rules" icon="pi pi-info-circle" onClick={(event) => menu.current.toggle(event)}/>
            </div>
}

function MainBar()
{
  const isLargeScreen= useMediaQuery({ minWidth: 500 })

  return   <Toolbar className="p-1" style={{ borderRadius: '3rem', backgroundImage: 'linear-gradient(to right, var(--gray-50), rgb(255, 42, 42))' }}
                    start={<div className="flex align-content-center align-items-center">
                            <Image src={LOGO} height="60rem" className="m-0 flex align-items-center align-content-center"/>
                            <div> <SmartContractButton /> <RulesButton /></div>
                          </div>}
                    center={<span className="text-6xl bangers-regular">$BRO Lotto</span>}
                    end={(isLargeScreen && <Image src={SNAIL} height="80rem" className="m-0 md:w-15rem w-min text-right"/>)} />

}

function BottomBar()
{
  return <Toolbar className="border-noround p-1 w-screen fixed bottom-0 left-0 text-400 text"
                  start={<> <a className="mr-3 p-0 pi pi-github" href="https://github.com/brothers-DAO" target="_blank" />  <a className="mr-3 p-0 pi pi-twitter" href="https://x.com/thebrothersdao" target="_blank"/> Brtohers DAO Lottery v{version} </>}
                  end={`${NETWORK} / ${CHAIN} / ${NS}`} />

}

function App()
{
  return <>
            <MainBar />
            <Card className="mt-2 p-0 border-round-xl">
              <TabView className="p-0 surface-50">
                <TabPanel  header="Dashboard">
                  <BuyButton />
                  <CurrentRoundDisplay />
                </TabPanel>

                <TabPanel header="Draw History" >
                  <RoundHistoryDisplay />
                </TabPanel>

                <TabPanel header="Entropy Source">
                  <Entropy />
                </TabPanel>

                <TabPanel header="Admin & Special">
                  <Admin />
                </TabPanel>
              </TabView>
           </Card>
           <BottomBar />
        </>
}

export default App;
