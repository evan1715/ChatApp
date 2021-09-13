//By putting io() in socket, it'll connect to the (socket) variable in index.js. It'll allow us to send and receive events from the client.
const socket = io();

//Elements. Putting the $ in front is a convention for letting us know that what's in the variable is from the DOM.
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

//Templates. We need .innerHTML to render the template correctly.
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    const $newMessage = $messages.lastElementChild;
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
    const viewHeight = $messages.offsetHeight;
    const containerHeight = $messages.scrollHeight;
    const distanceScrolled = $messages.scrollTop + viewHeight;

    if (containerHeight - newMessageHeight <= distanceScrolled) {
        $messages.scrollTop = $messages.scrollHeight; //<-- scroll to bottom
    }
}

socket.on('message', (message) => {
    console.log(message);
    //html is going to store the final HTML we'll be rendering to the browser.
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    //.insertAdjacentHTML will render stuff inside messages.
    //afterbegin would add it at the top, meaning newer messages would show up first inside the div.
    //afterend would be after the element closes. It wouldn't be inside our messages div.
    //beforebegin would be before the messages div.
    //beforeend would be before the messages div ends.
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomInfo', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room: room,
        users: users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    //This disables the form once it's been submitted
    $messageFormButton.setAttribute('disabled', 'disabled');

    //const message = document.querySelector('input').value;
    const message = e.target.elements.message.value; //alternative way to get the input
    
    socket.emit('sendMessage', message, (error) => {
        //This will re-enable the button once it's been sent.
        $messageFormButton.removeAttribute('disabled');
        //This will empty the message input once it's been sent.
        $messageFormInput.value = '';
        //This will focus by moving the cursor inside the input to continue messaging.
        $messageFormInput.focus();

        if (error) {
            return console.log(error);
        }
        console.log('Message delivered!');
    });
});

//The name of the event here MUST match the name of the event in index.js, however the argument does not need to be the same.
//To access the button from the .html file, we'll use document.querySelector('#increment');


// https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.');
    }

    //Disabled send location button once sent.
    $sendLocationButton.setAttribute('disabled', 'disabled');

    //Does not support async, so will use callback method.
    navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position);
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            //Remove the disabled button attribute, re-enabling it once completed.
            $sendLocationButton.removeAttribute('disabled');
            console.log("Location shared!");
        });
    });
});

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/'; //If there's an error, we'll push them back to the homepage.
    }
});