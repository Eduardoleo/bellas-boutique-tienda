const storageKey='boutique.checkout.intent.v1';
export function createCheckoutIntent(storage,uuid=()=>crypto.randomUUID()){
 let active=null;
 try{const saved=JSON.parse(storage?.getItem(storageKey)||'null');if(saved&&Number.isSafeInteger(saved.userId)&&typeof saved.key==='string')active={userId:saved.userId,key:saved.key,confirmed:!!saved.confirmed,body:null};}catch{}
 const persist=()=>{try{if(active)storage?.setItem(storageKey,JSON.stringify({userId:active.userId,key:active.key,confirmed:active.confirmed}));else storage?.removeItem(storageKey);}catch{}};
 const clear=()=>{active=null;persist();};
 return{
  syncUser(userId){if(!Number.isSafeInteger(userId)){if(active){active.body=null;persist();}return active;}if(active&&active.userId!==userId)clear();return active;},
  suspend(){if(active){active.body=null;persist();}},
  current(){return active;},clear,
  begin(userId,body){
   if(active&&active.userId!==userId)clear();
   if(active?.confirmed)return active;
   if(active&&!active.body)throw new Error('El resultado anterior es incierto. Consulte su estado antes de iniciar otra compra.');
   if(!active){active={userId,key:uuid(),body:JSON.parse(JSON.stringify(body)),confirmed:false};persist();}
   return active;
  },
  confirm(){if(active){active.confirmed=true;active.body=null;persist();}},
  rejected(status,code){if(active)active.correctable=(status===400&&['INVALID_BODY','INVALID_DATA','INVALID_QUANTITY','INVALID_PRODUCT','QUANTITY_OVERFLOW','INVALID_TOTAL','CART_EMPTY','INVALID_PRICE'].includes(code))||(status===404&&['RESOURCE_NOT_FOUND','PRODUCT_UNAVAILABLE'].includes(code))||(status===409&&code==='INSUFFICIENT_STOCK');},
  correct(){if(!active?.correctable)return false;clear();return true;}
 };
}
