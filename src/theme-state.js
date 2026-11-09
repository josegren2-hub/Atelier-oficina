const THEME_KEY='atelier.theme';
export function readNightPreference(storage) {
 try{return (storage??globalThis.localStorage)?.getItem(THEME_KEY)==='night';}catch{return false;}
}
export function saveNightPreference(night,storage) {
 try{(storage??globalThis.localStorage)?.setItem(THEME_KEY,night?'night':'day');return true;}catch{return false;}
}
