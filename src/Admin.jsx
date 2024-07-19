import { useState, useEffect, useRef } from 'react';
import { useDeepCompareMemo } from "use-deep-compare";
import * as dateMath from 'date-arithmetic'
import {Decimal} from 'decimals'

import { Fieldset } from 'primereact/fieldset';
import { InputText } from "primereact/inputtext";
import { Messages } from 'primereact/messages';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Accordion, AccordionTab } from 'primereact/accordion';

import {Pact, signWithChainweaver} from '@kadena/client'

import {usePreflight, submit, status} from "./pact";
import {useAccountGuard, useOpKeyset} from "./lottery_data";

const BTC_ORACLE = import.meta.env.VITE_BTC_ORACLE
const CHAIN = import.meta.env.VITE_CHAIN
const NETWORK = import.meta.env.VITE_NETWORK
const LOTTERY = import.meta.env.VITE_LOTTERY_NS + ".bro-lottery"

const _to_key = g => g?.keys?.[0] ?? ""

const btc_report_transaction = (hdrs, gp) =>  Pact.builder.execution(`(map (${BTC_ORACLE}.report-block) (read-msg 'headers))(format "{} blocks reported" [(length (read-msg 'headers))])`)
                                                                              .addData("headers", hdrs)
                                                                              .setMeta({chainId:CHAIN, gasLimit:18000*hdrs.length, gasPrice:1e-8, sender:gp.account})
                                                                              .setNetworkId(NETWORK)
                                                                              .addSigner(gp.key, (signFor) => [signFor("coin.GAS")])
                                                                              .createTransaction();

const settle_transaction = (gp) =>  Pact.builder.execution(`(${LOTTERY}.settle-round)`)
                                                .setMeta({chainId:CHAIN, gasLimit:10000, gasPrice:1e-8, sender:gp.account})
                                                .setNetworkId(NETWORK)
                                                .addSigner(gp.key, (signFor) => [signFor("coin.GAS")])
                                                .createTransaction();

const create_transaction = (admin, price, maxTickets, end_date, gp) =>  Pact.builder.execution(`(${LOTTERY}.create-round ${price.toFixed(5)} ${maxTickets} (read-msg 'end-date))`)
                                                                                    .addData("end-date", {timep:end_date.toISOString()})
                                                                                    .setMeta({chainId:CHAIN, gasLimit:2000, gasPrice:1e-8, sender:gp.account})
                                                                                    .setNetworkId(NETWORK)
                                                                                    .addSigner(gp.key, (signFor) => [signFor("coin.GAS")])
                                                                                    .addSigner(admin, (signFor) => [signFor(`${LOTTERY}.CREATE-ROUND`)])
                                                                                    .createTransaction();

const WAITING_SIG_MESSAGE = {sticky: true, severity: 'info', summary: 'Wallet signature', detail: "Waiting for wallet signature", closable: false}
const SIGNATURE_OK = {sticky: true, severity: 'success', summary: 'Signature OK', detail: "Wallet successfully signed the transaction", closable: true}
const SIGNATURE_ERROR = {sticky: true, severity: 'error', summary: 'Error in signature', detail: "Wallet refused to sign the transaction", closable: true}
const SEND_OK = {sticky: true, severity: 'success', summary: 'Sent', detail: "Transaction submitted to the network", closable: true}
const SEND_ERROR = {sticky: true, severity: 'error', summary: 'Send error', detail: "An error occured when sending the trnasaction", closable: true}
const WAITING_FOR_TRANSACTION = {sticky: true, severity: 'info', summary: 'Not confirmed', detail: "Waiting for network confirmation", closable: true}
const POLL_ERROR= {sticky: true, severity: 'error', summary: 'Poll error', detail: "Unable to retrieve the confirmation of the transaction", closable: true}


function Signer({onChange})
{
  const [account, setAccount] = useState("")
  const {guard, error} = useAccountGuard(account);
  const key = _to_key(guard)

  useEffect(() => {onChange((account && key)?{account, key}:null)}, [account, key, onChange])

  return <Fieldset legend="Gas payer" className="mb-2">
          <div className="p-inputgroup flex-1 max-w-max">
            <span className="p-inputgroup-addon"> <i className="pi pi-user"></i> </span>
            <InputText placeholder="Account" value={account} onChange={(e) => setAccount(e.target.value)} size={60} />
          </div>

          <div className="p-inputgroup flex-1 mt-2 max-w-max">
            <span className="p-inputgroup-addon"> <i className="pi pi-key"></i> </span>
            <InputText placeholder="Key" value={key} readOnly disabled size={60}/>
          </div>

          {account && error && <Message severity="error" text="Account not found" /> }
          {account && guard && !key && <Message severity="error" text="Unsupported account guard" /> }
        </Fieldset>
}

function result_to_msg(r)
{
    return {sticky: true, severity: r.status=="success"?'success':'error',
                          summary: r.status=="success"?'Transaction confirmed':'Transaction error',
                          detail: JSON.stringify(r) , closable: true}
}

function SignAndSubmit({trx})
{
  const [sent, setSent] = useState(false)
  const [signProcessing, setSignProcessing] = useState(false)
  const {data:pf_result, error:pf_error} = usePreflight(trx)
  const msgs_trx = useRef(null);
  const pf_ok = pf_result && !pf_error

  useEffect(()=>{msgs_trx.current && msgs_trx.current.clear()}, [trx]);

  const doSign = () => {msgs_trx.current?.replace(WAITING_SIG_MESSAGE);
                        setSignProcessing(true);
                        return signWithChainweaver(trx).then( x => {console.log(x), msgs_trx.current?.show(SIGNATURE_OK); return x})
                                                   .catch(()=> msgs_trx.current?.show(SIGNATURE_ERROR))
                                                   .finally(() => {msgs_trx.current?.remove(WAITING_SIG_MESSAGE); setSignProcessing(false)})
                       }

  const doSubmit = cmd => {if(!cmd)
                            return;
                           setSignProcessing(true);
                           return submit(cmd).then(() => {msgs_trx.current?.show(SEND_OK); return cmd})
                                             .catch(() => msgs_trx.current?.show(SEND_ERROR))
                          }

  const doStatus = cmd => { if(!cmd)
                              return;
                            setSignProcessing(true);
                            setSent(true);
                            msgs_trx.current?.show(WAITING_FOR_TRANSACTION);
                            return status(cmd, NETWORK, CHAIN).then(x => {console.log(x); msgs_trx.current?.show(result_to_msg(x.result))})
                                                              .catch((e) => {console.log(e);msgs_trx.current?.show(POLL_ERROR)})
                                                              .finally(()=> {setSignProcessing(false); msgs_trx.current?.remove(WAITING_FOR_TRANSACTION);})
                          }

  return <>
          <div className="m-2">
          {pf_error && <Message severity="error" text={pf_error.toString()} /> }
          {pf_ok && <Message severity="success" text={pf_result} />}
          </div>

          <Button label="Sign/Submit with Chainweaver" disabled={!pf_ok || signProcessing} onClick={() => doSign().then(doSubmit).then(doStatus)} />

          <div className="m-2">
            <Messages ref={msgs_trx} />
          </div>
          </>
}

function PubliShEntropy ({gas_payer})
{
  const [value, setValue] = useState("")
  const headers = value.split("\n").map(x=>x.trim()).filter(x=>x.length > 0);
  const valid = headers.length > 0 && headers.length <= 8;

  const trx = useDeepCompareMemo(()=> (gas_payer && valid)?btc_report_transaction(headers, gas_payer):null, [headers, gas_payer])

  return  <>
            <p className="text-left line-height-3">
              Everybody can report BTC block headers (80 bytes in Hex: 160 Hexchars).<br />
              Only reporting the immediate followers of the previously reported blocks is allowed. <br />
              Up to 8 blocks can be reported in a single transaction. (one per line)
            </p>
            <InputTextarea className="w-full mb-2" placeholder="Hex header (80 bytes)" value={value} onChange={(e) => setValue(e.target.value)} />
            {headers.length == 0 && <Message severity="info" text="Please report at least one block" /> }
            {headers.length > 8 && <Message severity="error" text="Number of reported blocks invalid" /> }
            <SignAndSubmit trx={trx} />
          </>
}

function SettleRound ({gas_payer})
{
  const trx = useDeepCompareMemo(()=> gas_payer?settle_transaction(gas_payer):null, [gas_payer])
  return  <>
            <p className="text-left line-height-3">
              Everybody can settle a round, as soon as the conditions are met.<br />
              Settling a round might require reporting some BTC block headers before.
            </p>
            <h3> Settle Current Round </h3>
            <SignAndSubmit trx={trx} />
          </>
}

function CreateRound ({gas_payer})
{
  const min_end = dateMath.add(new Date(), 3, "hours")
  const max_end = dateMath.add(min_end, 1, "month")

  const [price, setPrice] = useState(Decimal("0.001"))
  const [maxTickets, setMaxTickets] = useState(1000);
  const [endDate, setEndDate] = useState(min_end)
  const [adminKey, setAdminKey] = useState("")
  const op_keys = useOpKeyset();
  const trx = useDeepCompareMemo(()=> (gas_payer && adminKey)?create_transaction(adminKey, price, maxTickets, endDate, gas_payer):null, [price, maxTickets, endDate, gas_payer])

  return  <>
              <p className="text-left line-height-3">
                Creating a round is reserved to admins. and require to be counter-signed using an Admin key.
              </p>
              <div className="p-inputgroup flex max-w-max m-2">
                <span className="p-inputgroup-addon"> <i className="pi pi-key"> </i> </span>
                <Dropdown value={adminKey} onChange={e => setAdminKey(e.value)}  options={op_keys ?? []}  placeholder="Admin key" className="text-left w-full" />
              </div>

              <div className="flex flex-row flex-wrap">
            <div className="p-inputgroup flex max-w-max m-2">
              <span className="p-inputgroup-addon"> <i className="pi pi-dollar"> </i> </span>
              <span className="p-inputgroup-addon">Price </span>
              <InputNumber value={price.toString()} onChange={e=> setPrice(new Decimal(e.value))} min={0.000001} max={1.0} size={10} minFractionDigits={1} maxFractionDigits={6} />
            </div>

            <div className="p-inputgroup max-w-max m-2">
              <span className="p-inputgroup-addon"> <i className="pi pi-ticket"> </i> </span>
              <span className="p-inputgroup-addon">Max tickets </span>
              <InputNumber value={maxTickets} onChange={e=> setMaxTickets(e.value)} min={10} max={1000_000} size={8} />
            </div>

            <Calendar value={endDate} onChange={(e) => setEndDate(e.value)} placeholder="End of round" showTime hourFormat="12" minDate={min_end} maxDate={max_end} showIcon  />
            </div>
            <SignAndSubmit trx={trx} />

          </>
}

export function Admin ()
{
  const [gasPayer, setGasPayer] = useState(null)

  return <>
            <p className="text-left line-height-4">
              These functions are expected to be run automatically by bot.<br />
              This section must be considered as a fallback in case the bot has failure.
            </p>
            <Signer onChange={setGasPayer}/>
            <Accordion >
              <AccordionTab header="Publish Entropy (BTC Header)"> <PubliShEntropy gas_payer={gasPayer}/> </AccordionTab>
              <AccordionTab header="Settle current (finished) round"> <SettleRound gas_payer={gasPayer}/> </AccordionTab>
              <AccordionTab header="Create new Round"> <CreateRound gas_payer={gasPayer}/> </AccordionTab>
            </Accordion >
          </>
}
