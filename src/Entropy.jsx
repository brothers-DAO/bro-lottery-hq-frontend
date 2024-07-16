import {bigintToHex} from 'bigint-conversion';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

import {useOracleBlock} from "./lottery_data";

const rev_endianess = v=> Array.from({length:32}, (_,i)=>v.slice(i*2,i*2+2)).reverse().join("")
const to_hex_hash = x => rev_endianess(bigintToHex(x,false,32))

const mempool_link = x => <a target="_blank" href={"https://mempool.space/block/"+to_hex_hash(x)} style={{fontFamily:"monospace"}}> {x.toString()} </a>

export function Entropy ()
{
  const data = useOracleBlock()
  return <> <DataTable value={data} tableStyle={{ minWidth: '50rem' }}>
              <Column field="height" header="Height"></Column>
              <Column field="header_hash" header="Hash" body={x => mempool_link(x.header_hash)} ></Column>
              <Column field="ts" header="Timestamp" body={x => x.ts.toISOString()}> </Column>
            </DataTable>  </>
}
