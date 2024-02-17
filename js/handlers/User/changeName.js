const changeName = (data, socket, io, usernames ) => {
    usernames[socket.id] = {
        ...usernames[socket.id],
        username: data.username
    }

}

module.exports = changeName;