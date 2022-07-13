module.exports = validate = {
  operator: (op) => {
    //Regex for comparison operators
    const regex = /^(\!=|=|>|<|>=|<=)$/;
    if (!op.match(regex)) return false;
    return true;
  },

  date: (date) => {
    //Regex for date format
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!date.match(regex)) return false;
    return true;
  },

  bool: (letter) => {
    //Regex for y and n
    const regex = /^(y|n)$/;
    if (!letter.match(regex)) return false;
    return true;
  },
};
