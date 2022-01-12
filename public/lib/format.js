var options = { year: 'numeric', month: 'long', day: 'numeric' }
const dateFormat = new Intl.DateTimeFormat('en-US', options)

export default {

  date : (date) => {
    const d = new Date(date + 'T00:00:00')
    return dateFormat.format(d)
  },

  number : (num) => {
    return num.toLocaleString()
  }

}