import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  ToastAndroid,
  Alert
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import db from "../config";


const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookId: "",
      studentId: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      bookName: "",
      studentName: ""
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;

    if (domState === "bookId") {
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "studentId") {
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  handleTransaction =async () => {
    var { bookId,studentId } = this.state;

  await this.getBookDetails(bookId);
  await this.getStudentDetails(studentId);

  var transactionType = await this.checkBookAvailability(bookId)

  if(!transactionType){
    this.setState({bookId:"",studentId:""})
    Alert.alert("The book dosen't exist in the database")
  }
  else if(transactionType === "issue"){
    var isEligible = await this.checkStudentEligibilityForBookIssue(studentId)
    if(isEligible){
      var {bookName , studentName}=this.state
      this.initiateBookIssue(studentId,studentName,bookId,bookNameme)
      
    }
    Alert.alert("book has been issued to the student")
  }
  else {
    var isEligible = await this.checkStudentEligibilityForBookReturn(bookId,studentId)
    if(isEligible){
      var {bookName ,studentName}=this.state
      this.initiateBookReturn(studentId,studentName,bookId,bookName)
    }
    Alert.alert("book has been returned to the library")
  }
}


    
  
  checkStudentEligibilityForBookIssue=async studentId =>{
    const studentRef = await db.collection("students").where("student_id","==",studentId).get()
    var isStudentEligible = ""
    if(studentRef.docs.length === 0){
      this.setState({
        bookId : "",
        studentId : ""
      })
      isStudentEligible = false 
      Alert.alert("this student dose'nt exist in our database")
    }
    else {
      studentRef.docs.map(doc=>{
        if(doc.data().number_books_issued<2){
          isStudentEligible = true
        }
        else {
          isStudentEligible = false
          Alert.alert("student has already issued 2 books")
          this.setState({
            bookId:"",
            studentId: ""
          })
        }
      })
    }
    return isStudentEligible;
  }

  checkStudentEligibilityForBookReturn=async(bookId,studentId) =>{
    const transactionRef = await db.collection("transactions").where("book_id","==",bookId).limit(1).get()
    var isStudentEligible = ""
    transactionRef.docs.map(doc=>{
      var lastBookTransaction = doc.data()
      if(lastBookTransaction.student_Id === studentId){
        isStudentEligible = true

      }else {
        isStudentEligible = false
        Alert.alert("book is not issued by this student")
        this.setState({
          bookId: "",
          studentId : ""
        })
      }
    })
   
     
    return isStudentEligible;
  }

  getBookDetails = bookId => {
    bookId = bookId.trim();
    db.collection("books")
      .where("book_id", "==", bookId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            bookName: doc.data().book_details.book_name
          });
        });
      });
  };

  getStudentDetails = studentId => {
    studentId = studentId.trim();
    db.collection("students")
      .where("student_id", "==", studentId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            studentName: doc.data().student_details.student_name
          });
        });
      });

      
  };

     checkBookAvailability=async bookId =>{
       const bookRef = await db.collection("books").where("book_id","==",bookId).get()
       var transactionType = ""
       if(bookRef.docs.length === 0){
         transactionType = false;
       }
       else {
         bookRef.docs.map(
           doc=>{transactionType= doc.data().is_book_available?"issue":"return"}
         )
       }
       return transactionType;
     }



  initiateBookIssue = (studentId,studentName,bookId,bookName) => {
    console.log("Book issued to the student!");
   db.collection("transactions").add({

        student_Id : studentId,
        student_name :studentName,
        book_Id : bookId,
        book_name : bookName,
        date:firebase.firestore.Timestamp.now().toDate(),
        Transaction_type:"issue",

   })
 
  db.collection("books")
      
       .doc(bookId)
       .update({

        is_book_available : false

       })

   db.collection("students")
   
       .doc(studentId)
       .update({

         number_books_issued : firebase.firestore.FieldValue.increment(1)

       })
       
       this.setState({
        bookId : "",
        studentId : "" 
       })

  };

  initiateBookReturn = (studentId,studentName,bookId,bookName) => {
    console.log("Book returned to the library!");
    db.collection("transactions").add({

      student_Id : studentId,
      student_name :studentName,
      book_Id : bookId,
      book_name : bookName,
      date:firebase.firestore.Timestamp.now().toDate(),
      Transaction_type:"return",

 })

db.collection("books")
    
     .doc(bookId)
     .update({

      is_book_available : true

     })

 db.collection("students")
 
     .doc(studentId)
     .update({

       number_books_issued : firebase.firestore.FieldValue.increment(-1)

     })
     
     this.setState({
      bookId : "",
      studentId : "" 
     })

  


  };

  render() {
    const { bookId, studentId, domState, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
    
      <KeyboardAvoidingView behavior = "padding" style={styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"Book Id"}
                placeholderTextColor={"#FFFFFF"}
                value={bookId}
                onChangeText={text =>this.setState({bookId:text})}
                
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("bookId")}
              >
                <Text style={styles.scanbuttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"Student Id"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={text =>this.setState({studentId:text})}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("studentId")}
              >
                <Text style={styles.scanbuttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, { marginTop: 25 }]}
              onPress={this.handleTransaction}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  },
  button: {
    width: "43%",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F48D20",
    borderRadius: 15
  },
  buttonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontFamily: "Rajdhani_600SemiBold"
  }
});
