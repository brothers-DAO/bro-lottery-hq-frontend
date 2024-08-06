import { useMediaQuery } from 'react-responsive';
import * as dateMath from 'date-arithmetic';
import {Decimal} from 'decimals';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Panel } from 'primereact/panel';
import { Card } from 'primereact/card';
import { Steps } from 'primereact/steps';

import {usePoolsBalances, useTickets, useAllTickets, useResult, useRoundAccounts} from './lottery_data';

const EXPLORER = import.meta.env.VITE_EXPLORER;
const BRO = import.meta.env.VITE_BRO_NS + ".bro";

const ExplorerLink = ({trx}) => <a target="_blank" href={EXPLORER + "/txdetail/" + trx}> {trx} </a>

const ExplorerAccountLink = ({acct}) => <a target="_blank" className="mx-1 pi pi-external-link" href={`${EXPLORER}/account/${acct}?token=${BRO}`} />

function StateDisplay({state, start_time, end_time})
{
  const STATES = ["RUNNING", "ENDED", "SETTLED"]
  const settle_time = end_time?dateMath.add(end_time, 2, "hours"):null;
  const _make_label = (l, d) => <> {l} <br/> <span className="text-xs"> ({d?.toLocaleString()}) </span> </>


  const ITEMS = [{label:_make_label("Tickets for sale", start_time)},
                 {label: _make_label("Sales ended", end_time)},
                 {label: _make_label("Drawn", settle_time)}]

  return <Steps className="" model={ITEMS} activeIndex={STATES.indexOf(state)} />

}

const show_price = x => (x?x.toFixed(4):"/") + String.fromCharCode(160) + "$BRO"
const show_int = x => x!=null?x.toString():"."


const DisplayItem = ({title, value, account}) => <Card className="flex-1 shadow-4">
                                          <div className="flex flex-column gap-1">
                                            <span className="text-secondary text-l text-orange-600">{title} {account && <ExplorerAccountLink acct={account} />}</span>
                                            <span className="font-bold text-lg">{value}</span>
                                          </div>
                                        </Card>


function PrizeTable({main_bal, jackpot_bal})
{
  const _main_bal = main_bal??Decimal(0)
  const _jackpot_bal = jackpot_bal??Decimal(0)

  const data = [{title:"1st Prize", prize:_main_bal.mul(Decimal("0.50")), jack:_jackpot_bal.mul(Decimal("0.8"))},
                {title:"2nd Prize", prize:_main_bal.mul(Decimal("0.25")), jack:null},
                {title:"3rd Prize", prize:_main_bal.mul(Decimal("0.15")), jack:null}]

  return  <DataTable value={data} selectionMode="single" showGridlines className="align-items-center max-w-30rem border-1 shadow-4">
            <Column header="" field="title" />
            <Column header="Prize" body={x=>show_price(x.prize)} />
            <Column header="Jackpot" body={x=>x.jack!=null?show_price(x.jack):""} />
          </DataTable>
}

const shortened_account = (x) => x.length >= 10?x.substring(0,5)+"..."+x.substring(x.length-3):x

function WinnersTable({round_id, result})
{
  const winning_tickets = useTickets(round_id, result.winning_tickets)
  const isLargeScreen= useMediaQuery({ minWidth: 800 })

  const __get_account = x => winning_tickets?.[x]?.account ?? "/"

  const data = [{title:__get_account(0), prize:result.final_round_bal.mul(Decimal("0.50")), jack:result.jackpot_won?result.final_jackpot_bal.mul(Decimal("0.8")):null},
                {title:__get_account(1), prize:result.final_round_bal.mul(Decimal("0.25")), jack:null},
                {title:__get_account(2), prize:result.final_round_bal.mul(Decimal("0.15")), jack:null},
                {title:"Fees", prize:result.final_round_bal.mul(Decimal("0.05")), jack:null},
                {title:"Community", prize:result.final_round_bal.mul(Decimal("0.05")), jack:null},
                {title:"For next round", prize:null, jack:result.final_jackpot_bal.mul(Decimal(result.jackpot_won?"0.2":"1.0"))}]


  return  <DataTable value={data} selectionMode="single" showGridlines className="align-items-center border-1 shadow-4 max-w-max">
            <Column header="" body={({title}) => isLargeScreen?title:shortened_account(title)} />
            <Column header="Prize" body={x=>x.prize!=null?show_price(x.prize):""} />
            <Column header="Jackpot" body={x=>x.jack!=null?show_price(x.jack):""} />
          </DataTable>
}

const onSortAccount = ({data, order}) => data.sort( (x,y) => (x.account < y.account) ? order : -order)

function TicketTable({round_id})
{
  const tickets = useAllTickets(round_id);
  const isLargeScreen= useMediaQuery({ minWidth: 800 })

  console.log("-------------------------------")
  console.log(isLargeScreen)

  return  <DataTable value={tickets} showGridlines className="max-w-max" paginator rows={16}>
            <Column sortable field="rank" header="#" style={{ width: '25%', fontFamily:"monospace" }}></Column>
            <Column header="Account" field="account" body={({account}) => isLargeScreen?account:shortened_account(account)} filter sortable sortFunction={onSortAccount} style={{fontFamily:"monospace" }}></Column>
            <Column field="star_number" header="Lucky Star Number" style={{fontFamily:"monospace" }}></Column>
          </DataTable>
}

export function RoundDisplay({round, state, hasTitle})
{
  const [main_bal, jackpot_bal] = usePoolsBalances(round?.id)
  const [main_acct, jackpot_acct] = useRoundAccounts(round?.id)
  const result = useResult((state=="SETTLED" && round?.tickets_limit)?round?.id:null)

  const ListItem = ({title,value}) => <li> <span className="font-bold"> {title} : </span> <span style={{fontFamily:"monospace"}} > {value} </span> </li>

  const _main_bal = state=="SETTLED"?result?.final_round_bal:main_bal
  const _jackpot_bal = state=="SETTLED"?result?.final_jackpot_bal:jackpot_bal

  return <>
            {hasTitle &&  <h2> Round {round?.id} </h2>}
            <StateDisplay state={state} start_time={round?.start_time} end_time={round?.end_time} />
            <div className="flex flex-row flex-wrap gap-4 mt-5 ">
              <DisplayItem title="Ticket price" value={show_price(round?.ticket_price)} />
              <DisplayItem title="Tickets sold" value={show_int(round?.tickets_count) + " / " + show_int(round?.tickets_limit)} />
              <DisplayItem title="Main Pool" account={main_acct} value={show_price(_main_bal)} />
              <DisplayItem title="Jackpot Pool" account={jackpot_acct} value={show_price(_jackpot_bal)} />
            </div>

            <div className="flex mt-5 mb-5 justify-content-center">
              <PrizeTable main_bal={_main_bal} jackpot_bal={_jackpot_bal} />
            </div>

          <Panel header="Tickets" toggleable collapsed className="mb-2 line-height-3">
            <div className="flex  justify-content-center">
              <TicketTable round_id={round?.id} />
            </div>
          </Panel>
        {result &&
        <Panel header="Results" toggleable collapsed className="mb-2">
            <ul className="text-left line-height-3 p-0" >
              <ListItem title="Settlement transaction" value={<ExplorerLink trx={round.settlement_tx} />} />
              <ListItem title="Winning tickets" value={result.winning_tickets.join(" / ")} />
              <ListItem title="Lucky Star Number" value={result.star_number} />
              <ListItem title="Jackpot" value={result.jackpot_won?"YES":"NO"} />
            </ul>
            <div className="flex  justify-content-center">
              <WinnersTable round_id={round.id} result={result} />
            </div>

        </Panel>
        }
        <Panel header="Advanced" toggleable collapsed className="mb-2 line-height-3">
            <ul className="text-left line-height-3 p-0" style={{wordBreak:"break-all"}}>
              <ListItem title="Intrisic Seed" value={show_int(round?.inner_seed)} />
              <ListItem title="Minimum BTC Height" value={show_int(round?.btc_height)} />
              <ListItem title="Minimum BTC TS" value={round?dateMath.add(round.end_time, 2, "hours").toISOString():"/"} />
              <ListItem title="Seed" value={show_int(result?.seed)} />
              <ListItem title="Used BTC height for Extrinsic seed" value={show_int(result?.btc_height)} />
            </ul>
        </Panel>
        </>
}
