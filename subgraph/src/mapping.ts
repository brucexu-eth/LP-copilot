import {Address, ethereum} from '@graphprotocol/graph-ts';
import {Pool, Swap as SwapEvent} from '../generated/Pool/Pool';
import {PoolState, Swap} from '../generated/schema';
const address = Address.fromString('0x94bfc0574ff48e92ce43d495376c477b1d0eeec0');
export function handleBlock(block: ethereum.Block): void {
 const contract = Pool.bind(address);
 const slot = contract.try_slot0();
 const liquidity = contract.try_liquidity();
 if (slot.reverted || liquidity.reverted) return;
 let state = new PoolState(address.toHexString());
 state.chainId = 84532;
 state.pool = address;
 state.fee = 500;
 state.sqrtPriceX96 = slot.value.value0;
 state.tick = slot.value.value1;
 state.liquidity = liquidity.value;
 state.blockNumber = block.number;
 state.timestamp = block.timestamp;
 state.save();
}
export function handleSwap(event: SwapEvent): void {
 let swap = new Swap(event.transaction.hash.concatI32(event.logIndex.toI32()));
 swap.blockNumber = event.block.number;
 swap.timestamp = event.block.timestamp;
 swap.amount0 = event.params.amount0;
 swap.amount1 = event.params.amount1;
 swap.save();
}
