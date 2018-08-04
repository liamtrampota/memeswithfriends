import React from 'react';
import { StyleSheet, Button, TextInput, Text, View, Image, ListView, TouchableOpacity, Alert } from 'react-native';
import ImageSlider from 'react-native-image-slider';
import io from 'socket.io-client';

export default class App extends React.Component {
  constructor(props){
    super(props);
    this.socket = io('http://10.2.102.244:3000/');
    this.state = {
      username: 'Li'+"Min"+((new Date()).toISOString().slice(14,19).replace(/:/g,"_"))+"RAND"+String(Math.floor(Math.random()*100000)),
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
      turnMode:'', //player, judge, between, winner
      winners: '',
      winningImage: '',
      winningJudge: '',
    }
  }

  componentDidMount(){
    console.log('opponents:', this.state.opponents)
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
      var role;
      if(this.props.username === data.judge){
        role='Judge'
      } else {
        role='Player'
      }
      this.setState({opponents:opponents, deck:data.cards, turnMode:role})
    })
    this.props.socket.on('cardRequested', (data) => {
      console.log('new card: ', data)
      this.setState({deck:this.state.deck.concat(data)})
    })
    this.props.socket.on('opponent', (data) => {
      console.log('opponent joined', data)
      var newOpponents = this.state.opponents.slice()
      this.setState({opponents:newOpponents.concat(data)})
    })
    this.props.socket.on('usersWon', (data)=>{
      console.log('users won', data)
      this.setState({turnMode:'Winner', winners:data.winners, winningImage:data.image, winningJudge:data.judge})
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
    } else if(this.state.turnMode==='Judge') {
      return (
        <View style={styles.container}>
          <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-around'}}>
            <Text>Score: </Text>
            <Text>Round: </Text>
          </View>
          <Judge socket={this.props.socket} concept={this.state.concept} expectedSubmits={this.state.opponents.length}/>
        </View>
      )
    } else if(this.state.turnMode==="Winner"){
      return (
        <View style={styles.container}>
          <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-around'}}>
            <Text>Score: </Text>
            <Text>Round: </Text>
          </View>
          <Winner socket={this.props.socket} concept={this.state.concept}
          winners={this.state.winners} winningImage={this.state.winningImage} judge={this.state.winningJudge}/>
      </View>
    )
    } else {
      return (
        <View style={{flex:1, display:'flex', justifyContent:'center', alignItems:'center'}}>
          <Text>Loading</Text>
        </View>
      )
    }
  }
}

class Winner extends React.Component {
  constructor(props){
    super(props)
  }

  render(){
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <View>
          <Text style={{fontSize:20}}>
            Judge {this.props.judge} chose {this.props.winners[0]}'s {this.props.winners.length===0 ? null : "+ more" } meme!
          </Text>
        </View>
        <View style={{height:'60%', marginBottom:0, marginTop:10}}>
          <Text style={{fontSize:20}}>
            {this.props.concept}
          </Text>
          <Image source={{uri:this.props.winningImage}} style={{height:150, width:150}}/>
        </View>
        <Button onPress={()=>this.props.nextRound()} title="Next Round!">
        </Button>
      </View>
    )
  }
}

class Between extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      cardsPlayed: [],
      isWinnerChosen: false,
      winningCard: ''
    }
  }

  componentDidMount(){
    this.props.socket.emit('between')
    this.props.socket.on('between', (data) => {
      console.log(data)
      var cardsPlayed = []
      data.forEach(function(item){
        cardsPlayed.push(item.image)
      })
      this.setState({cardsPlayed: cardsPlayed})
    })
    //on between: expect past played cards
    this.props.socket.on('cardPlayed', (data) => {
      console.log(data);
      this.setState({cardsPlayed: this.state.cardsPlayed.concat(data.image)})
    })
    //on cardPlayed: expect new played card
    //on winnerChosen
    console.log('Between game mode entered')
  }

  winnerSelected(img){
    this.setState({winningCard: img, isWinnerChosen:true})
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
                                        this.props.socket.emit('playCard', img)
                                        this.props.setBetween()
                                        this.props.socket.emit('requestCard')}},
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
      submissions: [],
    }
  }

  componentDidMount(){
    this.props.socket.on('cardPlayed', (data) => {
      console.log("new submission");
      console.log(data)
      this.setState({submissions: this.state.submissions.concat(data.image)})
    })
  }

  selectImage(img){
    console.log(img);
    Alert.alert(
      'Confirm Submission',
      'Are you sure about this meme?',
      [
        {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
        {text: 'Confirm', onPress: () => {console.log('Confirm Pressed')
                                          this.props.socket.emit('winner', img.image)}},
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
            Still waiting for {this.props.expectedSubmits - this.state.submissions.length} submissions.
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
