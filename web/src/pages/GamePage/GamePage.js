import React, { useEffect } from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import { useConnectSocket, useSetupGame, useGameStore } from 'src/hooks/hooks'
import { navigate, routes } from '@redwoodjs/router'
import { useFlash } from '@redwoodjs/web'

import MainLayout from 'src/layouts/MainLayout/MainLayout'
import { WEBSOCKET_URL } from 'src/config'

import UserList from './UserList.js'
import Lobby from './Lobby'
import VotingForm from './VotingForm'
import InfoCard from './InfoCard'
import Paper from './Paper'

const GamePage = ({ roomId }) => {
  const { socket } = useConnectSocket(WEBSOCKET_URL)
  useSetupGame(socket, roomId)

  const set = useGameStore((state) => state.set)

  const userInformation = useGameStore((state) => state.userInformation)
  const { userColor } = userInformation

  const activeUser = useGameStore((state) => state.activeUser)
  const { category, pickedWord } = useGameStore((state) => state.words)
  const gameState = useGameStore((state) => state.gameState)
  const winners = useGameStore((state) => state.winners)

  const { addMessage } = useFlash()

  useEffect(() => {
    if (socket) {
      console.log('connected')
      socket.on('enter_lobby', (data) => {
        const { newUser, state: gameState } = JSON.parse(data)
        set((state) => {
          state.userInformation.inRoom = true
          state.userInformation.userId = newUser.userId

          state.gameState = gameState
        })
      })

      socket.on('new_users', (data) => {
        const { userList } = JSON.parse(data)
        console.log(userList)
        set((state) => {
          state.allUsers = [...userList]
        })
      })

      socket.on('set_active_user', (data) => {
        const { activeUserId } = JSON.parse(data)
        set((state) => {
          state.activeUser = activeUserId
        })
      })

      socket.on('role_chosen', (data) => {
        const { role } = JSON.parse(data)
        set((state) => {
          state.userInformation.userRole = role
        })
      })
      socket.on('question_master_chosen', (data) => {
        const { user } = JSON.parse(data)
        set((state) => {
          state.questionMaster = user
        })
      })
      socket.on('category_picked', (data) => {
        const { category } = JSON.parse(data)
        set((state) => {
          state.words.category = category
          state.words.pickedWord = '...'
        })
      })
      socket.on('picked_word', (data) => {
        const { pickedWord, category } = JSON.parse(data)
        set((state) => {
          state.words.pickedWord = pickedWord
        })
        addMessage(
          `The Word to try and draw is ${pickedWord} in the Category is ${category}`,
          { classes: 'large' }
        )
      })
      socket.on('turn_ended', (_) => {
        console.log('Need to Write a function for turn_ended')
      })

      socket.on('expose_faker', (data) => {
        const { winners, isFaker, faker } = JSON.parse(data)
        set((state) => {
          state.winners = winners
          state.isFaker = isFaker
          state.faker = faker
        })
      })
    }
    function disconnect() {
      if (socket) {
        console.log(roomId)
        socket.emit(
          'disconnecting',
          JSON.stringify({
            room: roomId,
          })
        )
        console.log('disconnected')
        set((state) => {
          state.userInformation.inRoom = false
        })
      }
    }
    return () => {
      //need to know the userInformation and room thats why its in the user section
      disconnect()
    }
  }, [socket, roomId, set])

  if (gameState === 'ENTERING_LOBBY' || gameState === 'WAITING') {
    return (
      <MainLayout>
        <Lobby socket={socket} />
      </MainLayout>
    )
  }

  if (gameState === 'EXPOSE' && winners) navigate(routes.reveal({ roomId }))
  return (
    <GameLayoutWrapper>
      <GameLayout userColor={userColor}>
        <div className="game-header">
          <div>
            <span className="tag">player</span>
            <h1>{userInformation.userName}</h1>
          </div>
        </div>
        <InfoCard socket={socket} />

        <div className="game-body side-by-side align-end">
          <UserList socket={socket} flatRight />
          <Paper
            {...{
              room: roomId,
              socket,
              userInformation,
              activeUser,
            }}
          />
        </div>
      </GameLayout>
      {gameState === 'VOTING' && <VotingForm socket={socket} />}
    </GameLayoutWrapper>
  )
}

export default GamePage

const GameLayout = styled.div`
  --user-color: ${({ userColor }) => (userColor ? userColor : `var(--blue)`)};
  display: grid;
  width: 100%;
  gap: 10px;
  ${InfoCard} {
    max-height: 160px;
  }
  .align-end {
    justify-content: center;
  }
  .game-header {
    h1 {
      margin: 0;
      background: var(--gradient);
      -webkit-text-fill-color: transparent;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      font-size: 3rem;
    }
    h3 {
      color: ${({ userColor }) => userColor};
      font-size: 1.75rem;
      margin-top: 4px;
      margin-bottom: 0;
    }
  }
  @media (min-width: 700px) {
    grid-template-columns: 1fr 500px;
    .game-header {
      grid-column: 1/2;
    }
    ${InfoCard} {
      grid-column: 2/3;
    }
    .game-body {
      grid-column: 1/-1;
    }
  }
  @media (min-width: 1000px) {
    grid-template-columns: 1fr 750px;
    .game-header {
      grid-column: 1/-1;
    }
    ${InfoCard} {
      grid-column: 1/2;
      grid-row: 2/3;
      margin: 0;
      max-height: unset;
    }
    .game-body {
      grid-column: 2/-1;
      grid-row: 2/3;
      width: 100%;
    }
  }
`
const GameLayoutWrapper = styled.div`
  padding: 20px 10px;
`
