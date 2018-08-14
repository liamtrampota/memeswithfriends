import React from 'react';
import { StyleSheet, Button, TextInput, Text, View, Image, ListView, TouchableOpacity, Alert } from 'react-native';
import ImageSlider from 'react-native-image-slider';
import io from 'socket.io-client';

export default class App extends React.Component {
  constructor(props){
    super(props);
    this.socket = io('http://10.1.10.129:3000')//io('https://damp-eyrie-10512.herokuapp.com/'); //'https://damp-eyrie-10512.herokuapp.com/'
    this.state = {
      username:'', //>>>
      // 'Li'+"Min"+((new Date()).toISOString().slice(14,19).replace(/:/g,"_"))+"RAND"+String(Math.floor(Math.random()*100000)),
      usernameSubmit: false
    }
  }

  componentDidMount(){
    this.socket.emit('test', 'hi rod')
    this.socket.on('test', (data)=>{console.log(data)})
    this.socket.on('errorMessage', (err)=>{console.log("FAIL, PROBABLY IN JOIN", err)})
  }

  submitUsername(){
    console.log('submited username')
    if(this.state.username.length>0){
      this.setState({usernameSubmit:true})
    } else {
      alert('Enter Username')
    }
  }

  render() {
    return (
      (this.state.usernameSubmit) ? <Game socket={this.socket} username={this.state.username}/> :
      <View style={styles.container}>
        <Image style={{height: 150, width:300, alignSelf:'center', margin:30}}
          source={{uri:'https://storage.googleapis.com/memes_with_friends/memes-logo.jpg'}}/>
        <TextInput
          style={{height: 40, width:200, borderColor: 'gray', borderWidth: 1, padding:5, textAlign:'center'}}
          onChangeText={(username) => this.setState({username})}
          value={this.state.username}
          placeholder='Enter Username'
        />
        <Button
          onPress={()=>this.submitUsername()}
          title="Join Game"
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
      myScore: 0,
      allScores: [],
      concept: '', //>>>
      turnMode:'', //player, judge, between, winner
      winners: [''],
      winningImage: '',
      winningJudge: '',
      round: 1
    }
  }

  componentDidMount(){
    console.log("Does Mounting Only Happen Once in Round 1?")
    // [] // console.log('opponents:', this.state.opponents)
    this.props.socket.emit('join', this.props.username)
    this.props.socket.on('joined', (data)=>{
      console.log('join data', data);
      var cards = data.cards
      console.log('cards: ', cards)
      var uniqueCards = cards.filter(function(item, pos, self) {
          return self.indexOf(item) == pos;
      })
      console.log('uniqueCards: ', cards)
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
      if(uniqueCards.length !== 7){
        this.setState({opponents:opponents, turnMode:role, concept:data.concept, deck:uniqueCards})
        this.props.socket.emit('requestCard')
      } else {
        this.setState({opponents:opponents, deck:uniqueCards, turnMode:role, concept:data.concept})
      }
    })
    this.props.socket.on('cardRequested', (img) => {
      console.log('new card: ', img)
      var cards = this.state.deck.concat(img)
      var cards = [img].concat(this.state.deck)
      console.log('cards', cards)
      var uniqueCards = cards.filter(function(item, pos, self) {
          return self.indexOf(item) == pos;
      })
      console.log('uniqueCards ', uniqueCards)
      if(uniqueCards.length !== 7){
        this.props.socket.emit('requestCard')
      } else {
        this.setState({deck:uniqueCards})
      }
    })
    this.props.socket.on('opponentJoined', (data) => {
      console.log('opponent joined', data)
      var newOpponents = this.state.opponents.slice()
      this.setState({opponents:newOpponents.concat(data)})
    })
    this.props.socket.on('usersWon', (data)=>{
      console.log('users won', data)
      var newScore=this.state.myScore
      if(data.winners.includes(this.props.username)){
        console.log('winner updating Score')
        newScore++
        this.setState({myScore:newScore})
      }
      if(this.state.turnMode==='Judge'){this.props.socket.emit('confirmWin')}
      this.setState({turnMode:'Winner', winners:data.winners, winningImage:data.image, winningJudge:data.judge, allScores:data.allScores, round:data.round})
    })
    this.props.socket.on('winConfirmed', (data) =>{
      console.log('Win Confirmed!: ', data)
      console.log('username: ', this.props.username)
      if(this.props.username===data.username){
        this.setState({turnMode:'Judge', concept:data.concept})
      } else {
        this.setState({turnMode:'Player', concept:data.concept})
      }
    })
    this.props.socket.on('judgeLeft', (username) => {
      console.log('judge left username:', username)
      var index = this.state.opponents.indexOf(username)
      var newOpponents = this.state.opponents.slice()
      newOpponents.splice(index, 1)
      this.setState({turnMode:'JudgeLeft', opponents:newOpponents})

    })
    this.props.socket.on('playerLeft', (username) => {
      console.log('player left username:', username)
      var index = this.state.opponents.indexOf(username)
      var newOpponents = this.state.opponents.slice()
      newOpponents.splice(index, 1)
      this.setState({opponents:newOpponents})
    })

    // on concept: receive current concept
    console.log('Entered Game')
  }

    removeCard(index){
      console.log('removing card at index: ', index)
      var newDeck = this.state.deck.slice();
      newDeck.splice(index, 1)
      console.log('new deck:', newDeck)
      this.setState({deck:newDeck}, ()=>{this.props.socket.emit('requestCard')})
    }


  setBetween(img){
    console.log('setting mode to between, played card:', img)
    this.setState({turnMode: 'Between', playedCard:img.image})
  }

  render() {

    if(this.state.turnMode==='Between'){
      console.log('render between:', this.state.playedCard)
      return (
        <View style={styles.container}>
          <Header username={this.props.username} score={this.state.myScore} round={this.state.round}/>
          {/* <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-between'}}>
            <Text style={{fontWeight: 'bold'}}>{this.props.username}{"\n"}
            Score: {this.state.myScore}{"\n"}
            Round: {this.state.round}</Text>
          </View> */}
          <Between socket={this.props.socket} concept={this.state.concept} playedCard={this.state.playedCard}/>
        </View>
      )
    } else if(this.state.turnMode==='Player'){
      return (
        <View style={styles.container}>
          <Header username={this.props.username} score={this.state.myScore} round={this.state.round}/>
          <Player socket={this.props.socket} deck={this.state.deck} concept={this.state.concept} setBetween={(img)=>this.setBetween(img)} removeCard={(index)=>this.removeCard(index)}/>
        </View>
      )
    } else if(this.state.turnMode==='Judge') {
      return (
        <View style={styles.container}>
          <Header username={this.props.username} score={this.state.myScore} round={this.state.round} />
          {/* <View style={{marginTop:30, display:'flex', flexDirection:'row', justifyContent:'space-around'}}>
            <Text>{this.props.username}{"\n"}
            Score: {this.state.myScore}
            Round: {this.state.round}</Text>
          </View> */}
          <Judge socket={this.props.socket} concept={this.state.concept} expectedSubmits={this.state.opponents.length}/>
        </View>
      )
    } else if(this.state.turnMode==="Winner"){
      return (
        <View style={styles.container}>
          <Header username={this.props.username} score={this.state.myScore} round={this.state.round}/>
          <Winner socket={this.props.socket} allScores={this.state.allScores} concept={this.state.concept}
          winners={this.state.winners} winningImage={this.state.winningImage} judge={this.state.winningJudge}/>
      </View>
    )
  } else if(this.state.turnMode==="JudgeLeft"){
    return(
      <JudgeLeft></JudgeLeft>
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

class JudgeLeft extends React.Component {
  render(){
    return(
      <View style={{display:'flex', alignItems:'center', justifyContent:'center', flex:1}}>
        <Text>The Judge left game. Restarting momentarily.</Text>
      </View>
    )
  }
}

class Winner extends React.Component {
  constructor(props){
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      dataSource: ds.cloneWithRows(this.props.allScores),
    }
  }

  render(){
    // return (
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <View style={{flex:1, alignItems:'center'}}>
    //       <Text style={{margin:60, fontSize:20}}>
    //         Make your best Meme
    //       </Text>
    //       <Text>
    //         Tap the image you'd like to submit
    //       </Text>
    //     </View>
    //     <View style={{height:'60%', marginBottom:0, marginTop:10, borderTopWidth:2}}>
    //       <Text style={{fontSize:30, textAlign:'left', marginLeft:10}}>
    //         {this.props.concept}
    //       </Text>
    //         <ImageSlider images={this.props.deck} onPress={(img)=>this.selectImage(img)}/>
    //     </View>
    //   </View>
    // )
    console.log('winning render:', this.props)
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between', display:'flex', width:'100%'}}>
        <View style={{flex: 2, display:'flex', justifyContent:'center', alignItems:'center', margin:10}}>
          {(this.props.winners.length==1)?<Text style={{fontSize:20, fontWeight: 'bold', textAlign:'center' }}> Judge {this.props.judge} chose {this.props.winners[0]}'s meme!
          </Text> : <Text style={{fontSize:20, fontWeight: 'bold', textAlign:'center',}}>
            Judge {this.props.judge} chose {this.props.winners[0]}'s and {this.props.winners[1]}'s meme!
          </Text>}
        </View>
        <View style={{marginBottom:0, borderWidth:2, display:'flex', justifyContent:'space-between', flex:12, marginLeft:20, marginRight:20, width:'100%'}}>
          <View>
            <Text style={{fontSize:25, textAlign:'left', marginLeft:10}}>
              {this.props.concept}
            </Text>
          </View>
          <View style={{flex:7, display:'flex', width:'100%'}}>
            <Image source={{uri:this.props.winningImage}}
              style={{height:'100%', width:'100%', alignSelf:'center'}}
              resizeMode='cover'
            />
          </View>
        </View>
        <View style={{marginBottom:0, display:'flex', justifyContent:'center', width:'100%', flex:8, marginTop:20}}>
          <View style={{borderTopWidth:2, width:'100%', justifyContent:'center', alignItems:'center'}}>
          </View>
            <Text style={{fontSize:20, fontWeight: 'bold', alignSelf:'center', backgroundColor:'red', color:'white', width:'100%', textAlign:'center'}}>
              ScoreBoard
            </Text>
          <ListView style={{flexGrow:0, backgroundColor: "black", padding:2, display: "flex", width:'100%'}}
            dataSource={this.state.dataSource}
            renderRow={(rowData) =>
              <View style={{justifyContent:'center', alignItems:'center', backgroundColor:'lightblue', width:'100%'}}>
                <Text style={{color:'black', fontSize:20, fontWeight:'bold'}}>{rowData.username}:{rowData.score}</Text>
              </View>
              }
          />
          {/* {this.props.allScores.map(scoreObj => {
            return <Text key={scoreObj.username}>{scoreObj.username}:{scoreObj.score}</Text>
          })} */}
        </View>
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
    console.log("Does Mounting Only Happen Once in Round 1?")
    console.log('playedCard:', this.props.playedCard)
    //this.setState({cardsPlayed:[this.props.playedCard].concat(this.state.cardsPlayed)})
    this.props.socket.emit('between')
    this.props.socket.on('betweened', (data) => {
      console.log('betweened data:', data)
      var cardsPlayed = []
      data.forEach(function(item){
        cardsPlayed.unshift(item.image)
      })
      this.setState({cardsPlayed:cardsPlayed})
    }) ////////setback
    //on between: expect past played cards
    this.props.socket.on('cardPlayed', (data) => {
      console.log('card played:', data);
      //this.setState({cardsPlayed: this.state.cardsPlayed.concat(data.image)})
      this.setState({cardsPlayed: [data.image].concat(this.state.cardsPlayed)})
    })
    //on cardPlayed: expect new played card
    //on winnerChosen
    console.log('Between game mode entered')
  }


  //
  // winnerSelected(img){
  //   this.setState({winningCard: img, isWinnerChosen:true})
  // }



  render() {
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <View style={{flex:1, alignItems:'center', justifyContent:'space-around'}}>
          <Text style={{fontSize:20, fontWeight:'bold', color:'red'}}>
            The Judge is Deliberating
          </Text>
          <Image source={require('./assets/judge.png')} style={{height:100, width:100}}/>
          <Text style={{fontSize:20}}>
            Submissions Below
          </Text>
        </View>
        <View style={{flex:2, marginBottom:0, borderTopWidth:2}}>
          <Text style={{fontSize:25, textAlign:'left', marginLeft:10}}>
            {this.props.concept}
          </Text>
          <ImageSlider images={this.state.cardsPlayed} resizeMode='stretch'/>
        </View>
      </View>
    )

    // return (
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <View style={{flex:1, alignItems:'center'}}>
    //       <Text style={{margin:60, fontSize:20}}>
    //         Make your best Meme
    //       </Text>
    //       <Text>
    //         Tap the image you'd like to submit
    //       </Text>
    //     </View>
    //     <View style={{height:'60%', marginBottom:0, marginTop:10, borderTopWidth:2}}>
    //       <Text style={{fontSize:30, textAlign:'left', marginLeft:10}}>
    //         {this.props.concept}
    //       </Text>
    //         <ImageSlider images={this.props.deck} onPress={(img)=>this.selectImage(img)}/>
    //     </View>
    //   </View>
    // )
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
                                        var playCardIndex = this.props.deck.indexOf(img.image);
                                        this.props.removeCard(playCardIndex)
                                        this.props.setBetween(img)}}
      ],
      { cancelable: true }
    )
  }

  render() {
    console.log(this.props.deck)
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
        <View style={{flex:1, alignItems:'center', justifyContent:'space-around'}}>
          <Text style={{fontSize:20, fontWeight:'bold', color:'blue'}}>
            Make your best Meme!
          </Text>
          <Image source={require('./assets/player.png')} style={{height:100, width:100}}/>
          <Text style={{fontSize:15, fontWeight:'bold', color:'green', textAlign:'center', paddingLeft:10, paddingRight:10}}>
            Swipe through your deck and tap the image you'd like to submit below.
          </Text>
        </View>
        <View style={{flex:2, borderTopWidth:2}}>
          <Text style={{fontSize:25, textAlign:'left', marginLeft:10}}>
            {this.props.concept}
          </Text>
            <ImageSlider images={this.props.deck} onPress={(img)=>this.selectImage(img)} resizeMode='stretch'/>
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
      // this.setState({submissions: this.state.submissions.concat(data.image)})
      this.setState({submissions: [data.image].concat(this.state.submissions)})
    })
  }

  selectImage(img){
    console.log(img);
    if(this.state.submissions.length>=this.props.expectedSubmits){
      Alert.alert(
        'Confirm Submission',
        'Are you sure about this meme?',
        [
          {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
          {text: 'Confirm', onPress: () => {console.log('Confirm Pressed')
                                          this.props.socket.emit('winner', img.image)
                                        }},

        ],
        { cancelable: true }
      )
    }
  }

  render() {
    console.log('submissions: ', this.state.submissions)
    return (
      <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between', width:'100%'}}>
        <View style={{flex:1, alignItems:'center', justifyContent:'space-around'}}>
          <Text style={{fontSize:20, fontWeight:'bold', textAlign:'center', paddingLeft:10, paddingRight:10}}>
            You are the judge this round!
          </Text>
          <Image source={require('./assets/judge.png')} style={{height:100, width:100}}/>
            {(this.state.submissions.length<this.props.expectedSubmits) ? <Text style={{fontSize:15, fontWeight:'bold', color:'red'}}>Still waiting for {this.props.expectedSubmits - this.state.submissions.length} submissions. </Text>: <Text style={{fontSize:20, fontWeight:'bold', color:'green'}}>Choose your favorite meme!</Text>}
        </View>
        <View style={{flex:2, borderTopWidth:2, width:'100%'}}>
          <Text style={{fontSize:25, textAlign:'left', marginLeft:10}}>
            {this.props.concept}
          </Text>
            {(this.state.submissions.length>0)?<ImageSlider images={this.state.submissions} onPress={(img)=>this.selectImage(img)} resizeMode='stretch'/> :<Text style={{fontSize:20, marginTop:50, alignSelf:'center', fontStyle:'italic'}}>...waiting for submissions...</Text>}
        </View>
      </View>
    )

    // return (
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <View style={{flex:1, alignItems:'center', justifyContent:'space-around'}}>
    //       <Text style={{fontSize:20, fontWeight:'bold', color:'blue'}}>
    //         Make your best Meme!
    //       </Text>
    //       <Image source={require('./images/player.png')} style={{height:100, width:100}}/>
    //       <Text style={{fontSize:15, fontWeight:'bold', color:'green', textAlign:'center', paddingLeft:10, paddingRight:10}}>
    //         Swipe through your deck and tap the image you'd like to submit below.
    //       </Text>
    //     </View>
    //     <View style={{flex:2, borderTopWidth:2}}>
    //       <Text style={{fontSize:25, textAlign:'left', marginLeft:10}}>
    //         {this.props.concept}
    //       </Text>
    //         <ImageSlider images={this.props.deck} onPress={(img)=>this.selectImage(img)} resizeMode='stretch'/>
    //     </View>
    //   </View>
    // )

    // return (
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <View style={{flex:1, alignItems:'center'}}>
    //       <Text style={{margin:60, fontSize:20}}>
    //         The Judge is Deliberating
    //       </Text>
    //       <Text style={{fontSize:20}}>
    //         Submissions Below
    //       </Text>
    //     </View>
    //     <View style={{height:'60%', marginBottom:0, marginTop:10, borderTopWidth:2}}>
    //       <Text style={{fontSize:30, textAlign:'left', marginLeft:10}}>
    //         {this.props.concept}
    //       </Text>
    //       <ImageSlider images={this.state.cardsPlayed}/>
    //     </View>
    //   </View>
    // )

    // return (
    //   (this.state.submissions.length>=this.props.expectedSubmits) ?
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <Text style={{margin:60, fontSize:30}}>
    //       Judge the memes!
    //     </Text>
    //     <View style={{flex:1, alignItems:'center'}}>
    //       <Text style={{fontSize:20}}>
    //         {this.props.concept}
    //       </Text>
    //     </View>
    //     <View style={{height:'70%', marginBottom:0, marginTop:10}}>
    //       <Text style={{fontSize:20, textAlign:'center'}}>
    //         Submissions
    //       </Text>
    //       <Text style={{fontSize:20, textAlign:'center'}}>
    //         Tap your favorite meme!
    //       </Text>
    //       <ImageSlider images={this.state.submissions} onPress={(img)=>this.selectImage(img)}/>
    //     </View>
    //   </View> :
    //   <View style={{flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent:'space-between'}}>
    //     <Text style={{margin:60, fontSize:30}}>
    //       Judge the memes!
    //     </Text>
    //     <View style={{flex:1, alignItems:'center'}}>
    //       <Text style={{fontSize:20}}>
    //         {this.props.concept}
    //       </Text>
    //     </View>
    //     <View style={{height:'70%', marginBottom:0, marginTop:10}}>
    //       <Text style={{fontSize:20, textAlign:'center'}}>
    //         Submissions
    //       </Text>
    //       <Text style={{fontSize:20, textAlign:'center'}}>
    //         Still waiting for {this.props.expectedSubmits - this.state.submissions.length} submissions.
    //       </Text>
    //       <ImageSlider images={this.state.submissions} />
    //     </View>
    //   </View>
    // )
  }
}

class Header extends React.Component{
  render(){
    return(
      <View style={{marginTop:30, display:'flex', justifyContent:'space-around', width:'100%'}}>
        <View style={{borderBottomWidth:.5,  width:'100%', alignItems:'center',}}>
          <Image source={require('./assets/logo-banner.jpg')} style={{height:30, width:250, padding:20}}/>
        </View>
        <View style={{flexDirection: 'row', justifyContent:'space-evenly', backgroundColor: 'beige',  padding: 5, alignItems:'center', width:'100%'}}>
          <Text style={{color:'red', marginRight:6, fontSize:20, fontWeight:'bold'}}>Score: {this.props.score}</Text>
          <Text numberOfLines={1} style={{fontWeight: 'bold',}}>{this.props.username}</Text>
          <Text style={{color: 'blue', marginLeft:6, fontSize:20, fontWeight:'bold'}}>Round: {this.props.round}</Text>
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
    width:'100%'
  }
});
