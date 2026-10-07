import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'

export async function deletePlayer(leagueId, playerId) {
  await deleteDoc(doc(db, 'leagues', leagueId, 'players', playerId))
}
