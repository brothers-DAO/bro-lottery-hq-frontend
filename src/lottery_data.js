import {Decimal} from 'decimals';
import {base64ToBigint} from 'bigint-conversion';
import {useLocalPact, useLocalPactImmutable} from './pact';

/* Modules refs */
const NETWORK = import.meta.env.VITE_NETWORK
const NS = import.meta.env.VITE_LOTTERY_NS
const CHAIN = import.meta.env.VITE_CHAIN
const BTC_ORACLE = import.meta.env.VITE_BTC_ORACLE
const LOTTERY = import.meta.env.VITE_LOTTERY_NS + ".bro-lottery"


/* Generic types Adapters */
export const to_big_int = x=>BigInt(x.int)
export const to_int = x=>Number(x.int)
export const to_decimal = v => v?(v.dec?Decimal(v.dec):Decimal(v)):Decimal(0)
const to_date = x=> x.time?new Date(x.time):new Date(x.timep)

/* Convert "-" in field names to "_" */
const sanitize =  (x) => x?Object.fromEntries(Object.entries(x).map(([key, value]) => [key.replaceAll("-","_"), value])):null;

/* Specifc objects adapters */
const _to_round_object = ({start_time, end_time, tickets_count, tickets_limit, btc_height, ticket_price, inner_seed, ...rest }) =>
                        ({start_time:to_date(start_time),
                          end_time:to_date(end_time),
                          tickets_count:to_int(tickets_count),
                          tickets_limit:to_int(tickets_limit),
                          btc_height:to_int(btc_height),
                          ticket_price:to_decimal(ticket_price),
                          inner_seed:base64ToBigint(inner_seed),
                          ...rest})

const _to_result_object = ({btc_height, seed, final_round_bal, final_jackpot_bal, winning_tickets, star_number,  ...rest }) =>
                         ({btc_height:to_int(btc_height),
                           seed:to_big_int(seed),
                           star_number:to_int(star_number),
                           final_round_bal:to_decimal(final_round_bal),
                           final_jackpot_bal:to_decimal(final_jackpot_bal),
                           winning_tickets: winning_tickets.map(to_int),
                           ...rest})

const _to_ticket_object = ({rank, star_number, ...rest }) => ({rank:to_int(rank), star_number:to_int(star_number), ...rest})

const _to_btc_block_object =  ({header_hash,height, ts,...rest}) => ({header_hash:to_big_int(header_hash), height:to_int(height), ts:to_date(ts), ...rest})


export const to_round_object = x => _to_round_object(sanitize(x))
export const to_result_object = x => _to_result_object(sanitize(x))
export const to_ticket_object = x => _to_ticket_object(sanitize(x))
export const to_btc_block_object = x => _to_btc_block_object(sanitize(x))


/* SWR hooks */
export function useOracleBlock()
{
  const {data} = useLocalPact(`(${BTC_ORACLE}.get-last-blocks 20)`, NETWORK, CHAIN);
  return data && data.map(to_btc_block_object);
}

export function useAccountGuard(a)
{
    const {data, error} = useLocalPactImmutable(a?`(coin.details "${a}")`:null, NETWORK, CHAIN);
    return {guard:data?.guard, error};
}

export function useOpKeyset()
{
    const {data} = useLocalPactImmutable(`(describe-keyset "${NS}.op")`, NETWORK, CHAIN);
    return data?.keys;
}

export function usePoolsBalances(round_id)
{
  const {data} = useLocalPact(round_id?`[(${LOTTERY}.round-balance "${round_id}"), (${LOTTERY}.jackpot-balance)]`:null, NETWORK, CHAIN);
  return data?data.map(to_decimal):[Decimal(0), Decimal(0)];
}

export function useCurrentRound()
{
  const {data} = useLocalPact(`(${LOTTERY}.current-round)`, NETWORK, CHAIN)
  return data && to_round_object(data);
}

export function useCurrentRoundState()
{
  const {data} = useLocalPact(`(${LOTTERY}.round-state)`, NETWORK, CHAIN)
  return data;
}

export function useRoundsHistory()
{
  const {data} = useLocalPact(`(filter (where 'id (!= (${LOTTERY}.current-round-id))) (${LOTTERY}.get-all-rounds))`, NETWORK, CHAIN)
  return data ? data.map(to_round_object):[]
}

export function useResult(round_id)
{
  const {data} = useLocalPactImmutable(round_id && `(${LOTTERY}.get-result "${round_id}")`, NETWORK, CHAIN)
  return data && to_result_object(data)
}

export function useTickets(round_id, tickets)
{
  const {data} = useLocalPactImmutable(round_id  && tickets && `(map (${LOTTERY}.get-ticket "${round_id}") ${JSON.stringify(tickets)})`, NETWORK, CHAIN)
  return data ? data.map(to_ticket_object) : []
}

export function useAllTickets(round_id)
{
  const {data} = useLocalPact(round_id && `(${LOTTERY}.get-all-tickets "${round_id}")`, NETWORK, CHAIN)
  return data ? data.map(to_ticket_object) : []
}
