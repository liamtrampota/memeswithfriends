import React from 'react';
import { StyleSheet, Button, TextInput, Text, View, Image, ListView, TouchableOpacity, Alert } from 'react-native';
import ImageSlider from 'react-native-image-slider';
import io from 'socket.io-client';

export default class App extends React.Component {
  constructor(props){
    super(props);
    this.socket = io('http://10.2.102.244:3000/');
    this.state = {
      username: 'Li',
      usernameSubmit: false
    }
  }

  componentDidMount(){
    this.socket.emit('test', 'hi rod')
    this.socket.on('test', (data)=>{console.log(data)})
  }

  submitUsername(){
    console.log('submited username')
    this.setState({usernameSubmit:true})
  }

  render() {
    return (
      (this.state.usernameSubmit) ? <Game socket={this.socket} username={this.state.username}/> :
      <View style={styles.container}>
        <Text style={{fontSize: 30, margin:10}}>
          Memes with Friends!
        </Text>
        <TextInput
          style={{height: 40, width:150, borderColor: 'gray', borderWidth: 1, padding:5, textAlign:'center'}}
          onChangeText={(username) => this.setState({username})}
          value={this.state.username}
          placeholder='Enter Username'
        />
        <Button
          onPress={()=>this.submitUsername()}
          title="Submit"
          color="blue"
        />
      </View>
    );
  }
}

class Game extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      deck:[],
      opponents: [],
      score: 0,
      concept: 'That face when your code works',
      turnMode:'Player' //player, judge, between
    }
  }

  componentDidMount(){
    console.log(this.state.opponents)
    this.props.socket.emit('join', this.props.username)
    this.props.socket.on('join', (data)=>{
      console.log('join data', data);
      var opponents = []
      var players = data.players
      console.log(players)
      players.forEach((username) => {
        if(username!==this.props.username){
          opponents.push(username)
        }
      })
      this.setState({opponents:opponents, deck:data.cards})
    })
    this.props.socket.on('newCard', (data) => {
      console.log('new card: ', data)
      this.setState({deck:this.state.deck.concat(data)})
    })
    this.props.socket.on('opponent', (data) => {
      console.log('opponent joined', data)
      var newOpponents = this.state.opponents.slice()
      this.setState({opponents:newOpponents.concat(data)})
    })
    // on concept: receive current concept
    console.log('Entered Game')
  }

  setBetween(){
    this.setState({turnMode: 'Between'})
  }

  render() {
    if(this.state.turnMode==='Between'){
      return (
        <View style={styles.container}>
          <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-between'}}>
            <Text>Score: </Text>
            <Text>Round: </Text>
          </View>
          <Between socket={this.props.socket} concept={this.state.concept} />
        </View>
      )
    } else if(this.state.turnMode==='Player'){
      return (
        <View style={styles.container}>
          <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-around'}}>
            <Text>Score: </Text>
            <Text>Round: </Text>
          </View>
          <Player socket={this.props.socket} deck={this.state.deck} concept={this.state.concept} setBetween={()=>this.setBetween()}/>
        </View>
      )
    } else {
      return (
        <View style={styles.container}>
          <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-around'}}>
            <Text>Score: </Text>
            <Text>Round: </Text>
          </View>
          <Judge socket={this.props.socket} concept={this.state.concept} expectedSubmits={this.state.opponents.length}/>
        </View>
      )
    }
  }
}

class Between extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      cardsPlayed: [],
      winner: false,
      winningCard: 'https://png.pngtree.com/svg/20170524/anonymous_689740.png'
    }
  }

  componentDidMount(){
    this.props.socket.emit('between')
    this.props.socket.on('between', (data) => {
      console.log(data)
      this.setState({cardsPlayed: data})
    })
    //on between: expect past played cards
    this.props.socket.on('cardPlayed', (data) => {
      console.count("SOCKETON-CARDPLAYED");
      console.log(data);
      console.log(this.state.cardsPlayed.concat(data))
      var cardsPlayed = this.state.cardsPlayed.slice()
      this.setState({cardsPlayed: this.state.cardsPlayed.concat(data)})
    })
    //on cardPlayed: expect new played card
    //on winnerChosen
    console.log('Between game mode entered')
  }

  winnerSelected(img){
    this.setState({winningCard: img, winner:true})
  }

  render() {
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <View>
          <Text style={{fontSize:20}}>
            The Judge is Deliberating
          </Text>
          <Text style={{fontSize:20}}>
            {this.props.concept}
          </Text>
        </View>
        <View style={{height:'60%', marginBottom:0, marginTop:10}}>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Submissions
          </Text>
          <ImageSlider images={this.state.cardsPlayed}/>
        </View>
      </View>
    )
  }
}

class Player extends React.Component {

  selectImage(img){
    console.log(img);
    Alert.alert(
      'Confirm Submission',
      'Are you sure about this meme?',
      [
        {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
        {text: 'Confirm', onPress: () => {console.log('Confirm Pressed')
                                        this.props.socket.emit('playCard', img) //???
                                        this.props.setBetween()}},
      ],
      { cancelable: true }
    )
  }

  render() {
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <Text style={{margin:60, fontSize:20}}>
          Make your best Meme
        </Text>
        <View style={{flex:1, alignItems:'center'}}>
          <Text style={{fontSize:20}}>
            {this.props.concept}
          </Text>
        </View>
        <View style={{height:'60%', marginBottom:0, marginTop:10}}>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Your Deck
          </Text>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Tap the image you'd like to submit
          </Text>
            <ImageSlider images={this.props.deck} onPress={(img)=>this.selectImage(img)}/>
        </View>
      </View>
    )
  }
}

class Judge extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      submissions: ['https://imgflip.com/s/meme/Black-Girl-Wat.jpg', 'https://imgflip.com/s/meme/Roll-Safe-Think-About-It.jpg', 'https://i.kym-cdn.com/entries/icons/original/000/016/546/hidethepainharold.jpg']
    }
  }

  componentDidMount(){
    //emit Judge
    //on newSubmission
  }

  selectImage(img){
    console.log(img);
    Alert.alert(
      'Confirm Submission',
      'Are you sure about this meme?',
      [
        {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
        {text: 'Confirm', onPress: () => console.log('Confirm Pressed')},
      ],
      { cancelable: true }
    )
  }

  render() {
    return (
      (this.state.submissions.length>=this.props.expectedSubmits) ?
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <Text style={{margin:60, fontSize:30}}>
          Judge the memes!
        </Text>
        <View style={{flex:1, alignItems:'center'}}>
          <Text style={{fontSize:20}}>
            {this.props.concept}
          </Text>
        </View>
        <View style={{height:'70%', marginBottom:0, marginTop:10}}>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Submissions
          </Text>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Tap your favorite meme!
          </Text>
          <ImageSlider images={this.state.submissions} onPress={(img)=>this.selectImage(img)}/>
        </View>
      </View> :
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <Text style={{margin:60, fontSize:30}}>
          Judge the memes!
        </Text>
        <View style={{flex:1, alignItems:'center'}}>
          <Text style={{fontSize:20}}>
            {this.props.concept}
          </Text>
        </View>
        <View style={{height:'70%', marginBottom:0, marginTop:10}}>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Submissions
          </Text>
          <Text style={{fontSize:20, textAlign:'center'}}>
            Still waiting for {ths.props.expectedSubmits - this.state.submissions.length} submissions.
          </Text>
          <ImageSlider images={this.state.submissions} />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
