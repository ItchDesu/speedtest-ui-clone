let isMultiConnection = true

export function changeConnectionType () {
    const connectionIconContainer = document.querySelector('.connection-icon-container')
    const connectionIcons = document.querySelectorAll('.connection-icon')
    const connectionNames = document.querySelectorAll('.connection-type-link')
    const multiConnection = document.querySelector('#multi-connection')
    const singleConnection = document.querySelector('#single-connection')

    changeConnectionTestButtonColor()

    function changeConnectionIconType () {
        connectionIcons.forEach((icon) => {
            icon.classList.toggle('active')
        })
    }

    connectionIconContainer.addEventListener('keydown', (event) => {
        if (event.keyCode === 13) {
            connectionIconContainer.click()
        }
    })

    connectionIconContainer.addEventListener('click', () => {
        changeConnectionIconType()

        connectionNames.forEach((connectionName) => {
            if (connectionName.classList.contains('text-white')) {
                connectionName.classList.remove('text-white')
                connectionName.classList.add('text-gray')
            } else {
                connectionName.classList.remove('text-gray')
                connectionName.classList.add('text-white')
            }
        })

        if (multiConnection.classList.contains('text-white')) {
            isMultiConnection = true
        } else {
            isMultiConnection = false
        }

        changeConnectionTestButtonColor()
    })

    multiConnection.addEventListener('click', () => {
        if (!multiConnection.classList.contains('text-white')) {
            multiConnection.classList.add('text-white')
            multiConnection.classList.remove('text-gray')

            singleConnection.classList.remove('text-white')
            singleConnection.classList.add('text-gray')

            changeConnectionIconType()

            isMultiConnection = true

            changeConnectionTestButtonColor()
        }
    })

    singleConnection.addEventListener('click', () => {
        if (!singleConnection.classList.contains('text-white')) {
            singleConnection.classList.add('text-white')
            singleConnection.classList.remove('text-gray')

            multiConnection.classList.remove('text-white')
            multiConnection.classList.add('text-gray')

            changeConnectionIconType()

            isMultiConnection = false

            changeConnectionTestButtonColor()
        }
    })
}

const socket = io()

export function executeConnectionTest () {
    const connectionTestButton = document.querySelector('.main-connection-test-button-container')
    const resultsSettingsContainer = document.querySelector('.main-results-settings-container')
    const connectionParametersContainer = document.querySelector('.connection-parameters')
    const connectionTypeContainer = document.querySelector('.main-connection-type')
    const downloadUploadGraphic = document.querySelector('#download-upload-line-graphic')
    const networkSpeedometer = document.querySelector('.network-speedometer')
    const parameterValues = document.querySelectorAll('.parameter-value')

    connectionTestButton.addEventListener('click', async () => {
        resultsSettingsContainer.classList.add('disabled')
        connectionTypeContainer.classList.add('disabled')
        connectionTestButton.classList.add('disabled')
        connectionParametersContainer.classList.remove('disabled')
        downloadUploadGraphic.classList.remove('disabled')
        networkSpeedometer.classList.remove('disabled')

        const ping = await pingTest()
        parameterValues[0].textContent = ping.toFixed(2)

        const download = await downloadTest()
        parameterValues[1].textContent = download.toFixed(2)

        const upload = await uploadTest()
        parameterValues[2].textContent = upload.toFixed(2)
    })
}

function pingTest () {
    return new Promise((resolve) => {
        const samples = []

        function handler (clientTime, serverTime) {
            samples.push(Date.now() - clientTime)
            if (samples.length < 10) {
                socket.emit('ping:client', Date.now())
            } else {
                socket.off('ping:server', handler)
                const avg = samples.reduce((a, b) => a + b, 0) / samples.length
                resolve(avg)
            }
        }

        socket.on('ping:server', handler)
        socket.emit('ping:client', Date.now())
    })
}

async function downloadTest () {
    const sizeMB = 25
    const t0 = performance.now()
    const res = await fetch(`/api/download?sizeMB=${sizeMB}`, { cache: 'no-store' })
    await res.arrayBuffer()
    const t1 = performance.now()
    const sec = (t1 - t0) / 1000
    return (sizeMB * 8) / sec
}

function uploadTest () {
    return new Promise((resolve) => {
        const sizeMB = 10
        const totalBytes = sizeMB * 1024 * 1024
        const chunk = new Uint8Array(64 * 1024)
        let sent = 0

        function finish (data) {
            socket.off('upload:result', finish)
            resolve(data.mbps)
        }

        socket.on('upload:result', finish)
        socket.emit('upload:start')
        socket.on('upload:ack', () => {
            while (sent < totalBytes) {
                socket.emit('upload:chunk', chunk)
                sent += chunk.byteLength
            }
            socket.emit('upload:stop')
        })
    })
}

function changeConnectionTestButtonColor () {
    const connectionTestButton = document.querySelector('.main-connection-test-button-container')

    if (isMultiConnection) {
        connectionTestButton.classList.add('multi-connection')
        connectionTestButton.classList.remove('single-connection')
    } else {
        connectionTestButton.classList.add('single-connection')
        connectionTestButton.classList.remove('multi-connection')
    }
}
