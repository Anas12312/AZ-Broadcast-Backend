// const audioPlayer = document.getElementById('audioPlayer');

// // URL of the audio streaming server
// const streamUrl = '/stream'; // Update this with your server URL

// // Fetch the audio stream and play it
// async function fetchAndPlayStream() {
//     try {
//         const response = await fetch(streamUrl);
//         if (!response.ok) {
//             throw new Error('Failed to fetch audio stream');
//         }

//         // Create a MediaStream from the response
//         const mediaStream = new MediaStream();
//         const mediaSource = new MediaSource();
//         mediaStream.addSourceBuffer(mediaSource);

//         // Set up the audio element to play the MediaStream
//         audioPlayer.srcObject = mediaStream;

//         // Start playing the audio
//         await audioPlayer.play();

//         // Read the stream data and append it to the MediaSource
//         const reader = response.body.getReader();
//         const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;
//             sourceBuffer.appendBuffer(value);
//         }
//     } catch (error) {
//         console.error('Error fetching and playing audio stream:', error);
//     }
// }

// // Start fetching and playing the audio stream when the page loads
// window.onload = fetchAndPlayStream;