import firestore from "@react-native-firebase/firestore";

export const crosswordsCollection = firestore().collection("crosswords");
export const gamesCollection = firestore().collection("games");
