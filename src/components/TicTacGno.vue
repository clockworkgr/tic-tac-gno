<script setup lang="ts">
import { computed, ref } from 'vue'
import { GnoWSProvider, MsgCall, MsgEndpoint } from '@gnolang/gno-js-client'
import { PubKeySecp256k1, Secp256k1PubKeyType, TransactionEndpoint, Tx, TxSignature, uint8ArrayToBase64 } from '@gnolang/tm2-js-client'
import { parsedJSONOrRaw } from '../utils/index'
import Long from 'long';

defineProps<{ msg: string }>()

const renderedGame=ref({} as any);

const myGames = ref([] as Array<string>);
const allAvailableGames = ref([] as Array<string>);
const gamesToJoin = computed(()=> {
  return allAvailableGames.value.filter(x => !myGames.value.includes(x));
});
const game = ref("");
const address = ref("");
const provider = ref(null as GnoWSProvider | null)
const refreshGamesList = async() => {
  allAvailableGames.value=parsedJSONOrRaw(await getAvailableGames(),true);
  myGames.value = parsedJSONOrRaw(await getGames(address.value),true);
}
const connectWallet = async () => {
  await window.adena.AddEstablish("TicTacGno");
  address.value = (await adena.GetAccount()).data.address;
  provider.value = new GnoWSProvider("ws://127.0.0.1:26657/websocket")
  allAvailableGames.value=parsedJSONOrRaw(await getAvailableGames(),true);
  myGames.value = parsedJSONOrRaw(await getGames(address.value),true);
  setInterval(() => { refreshGamesList(); },1000)
}
const getAvailableGames = async () => {
  return provider.value?.evaluateExpression("gno.land/r/clockwork/tictactoe",`GetAvailableGames("")`) ?? '';
}
const getGames = async (address:string) => {
  return provider.value?.evaluateExpression("gno.land/r/clockwork/tictactoe",`GetGames("${address}")`) ?? '';
}
const renderGame = async () => {
  renderedGame.value = parsedJSONOrRaw(await provider.value?.evaluateExpression("gno.land/r/clockwork/tictactoe",`GetGame("${game.value}")`) ?? '',true)
}
const startGame = async () => {
  const signed = await window.adena.Sign(
    {
      messages: [{
        type: "/vm.m_call",
        value: {
          caller: address.value, // your Adena address
          send: "",
          pkg_path: "gno.land/r/clockwork/tictactoe", // Gnoland package path
          func: "StartGame", // Function name
          args: [""]
        }
      }],
      gasFee: 1,
      gasWanted: 10000000,
      memo: ""
    })
  console.log(signed);
  const message = {
    
          typeUrl: MsgEndpoint.MSG_CALL,
          value: MsgCall.encode(signed.data.document.msgs[0].value).finish(),
        
  }
  const signature =   Buffer.from(signed.data.signature.signature, 'base64');
  const wrappedKey= { key: Buffer.from(signed.data.signature.pub_key.value, 'base64') };
  const txSignature: TxSignature = {
      pubKey: {
        typeUrl: Secp256k1PubKeyType,
        value: PubKeySecp256k1.encode(wrappedKey).finish(),
      },
      signature: new Uint8Array(signature),
    };

  const tx: Tx = {
    messages: [message],
    fee: {
      gasWanted: Long.fromString(signed.data.document.fee.gas),
      gasFee: signed.data.document.fee.amount[0].amount+signed.data.document.fee.amount[0].denom
    },
    memo: '',
    signatures: [txSignature],
  }
  console.log(tx);
  
  const encodedTx: string = uint8ArrayToBase64(Tx.encode(tx).finish());
  const resp = await provider.value?.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_COMMIT)

  console.log(resp);
  
}
const joinGame = async () => {
  const signed = await window.adena.Sign(
    {
      messages: [{
        type: "/vm.m_call",
        value: {
          caller: address.value, // your Adena address
          send: "",
          pkg_path: "gno.land/r/clockwork/tictactoe", // Gnoland package path
          func: "JoinGame", // Function name
          args: [gameToJoin.value]
        }
      }],
      gasFee: 1,
      gasWanted: 10000000,
      memo: ""
    })
  const message = {
    
          typeUrl: MsgEndpoint.MSG_CALL,
          value: MsgCall.encode(signed.data.document.msgs[0].value).finish(),
        
  }
  const signature =   Buffer.from(signed.data.signature.signature, 'base64');
  const wrappedKey= { key: Buffer.from(signed.data.signature.pub_key.value, 'base64') };
  const txSignature: TxSignature = {
      pubKey: {
        typeUrl: Secp256k1PubKeyType,
        value: PubKeySecp256k1.encode(wrappedKey).finish(),
      },
      signature: new Uint8Array(signature),
    };

  const tx: Tx = {
    messages: [message],
    fee: {
      gasWanted: Long.fromString(signed.data.document.fee.gas),
      gasFee: signed.data.document.fee.amount[0].amount+signed.data.document.fee.amount[0].denom
    },
    memo: '',
    signatures: [txSignature],
  }
  
  const encodedTx: string = uint8ArrayToBase64(Tx.encode(tx).finish());
  await provider.value?.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_COMMIT)
  game.value=gameToJoin.value
  setInterval(() => { renderGame() },1000)
}
const makeMove = async (row, col) => {
  const signed = await window.adena.DoContract(
    {
      messages: [{
        type: "/vm.m_call",
        value: {
          caller: address.value, // your Adena address
          send: "",
          pkg_path: "gno.land/r/clockwork/tictactoe", // Gnoland package path
          func: "MakeMove", // Function name
          args: [game.value, ""+row, ""+col]
        }
      }],
      gasFee: 1,
      gasWanted: 10000000,
      memo: ""
    })
 
}

const gameToJoin=ref("");
</script>

<template>
  <h1>{{ msg }}</h1>
  <template v-if="address == ''">
    <button v-on:click="() => { connectWallet(); }">Connect Wallet</button>
  </template>
  <template v-else>
    <template v-if="game != ''">
      <div>Game ID: {{  renderedGame.ID }}</div>
      <div>Player 1: {{  renderedGame.player1==address? "You": address }}</div>
      <div>Player 2: {{  renderedGame.player2==address? "You": address }}</div>
      <div>Next Turn: Player {{  renderedGame.turnPlayer }}</div>
      <div>Winner: {{ renderedGame.status==1 ? renderedGame.winner==0 ? "Draw" : "Player"+renderedGame.winner : "-" }}</div>
      <div class="board">
        <div class="boardRow" v-for="r in 3">
          <div class="boardBox" v-for="c in 3" v-on:click="() => { makeMove(r-1,c-1); }">
              {{ renderedGame.board[r-1][c-1]==0 ? '': renderedGame.board[r-1][c-1]==1 ? 'X': 'O'   }}
          </div>
        </div>
      </div>
      
    </template>
    <template v-else>
      <button v-on:click="() => { startGame(); }">Start Game</button>
      <div>
        <select v-model="gameToJoin">
  <option disabled value="">Please select a game to join</option>

  <option v-for="game in gamesToJoin" :key="game" :value="game">{{ game }}</option>

</select>
      <button v-on:click="() => { joinGame(); }">Join Game</button>
      </div>
    </template>
  </template>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
.board {
  width: 184px;
  height: 184px;
  margin: auto;
  margin-top:30px;
}
.boardRow {
  width: 184px;
  height:60px;
  display: flex;
  border-bottom: 2px solid white;
}
.boardRow:last-child {
  border-bottom:none;
}
.boardBox {
  width:60px;
  height: 60px;
  border-right: 2px solid white;
  cursor:pointer;
  line-height:60px;
  font-weight: 600;
  font-size: 42px;
}
.boardBox:last-child {
  border-right:none;
}
</style>
