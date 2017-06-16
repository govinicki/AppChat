function Room(name, id, owner) {
    this.name = name;
    this.id = id;
    this.owner = owner;
    this.people = [];
    this.status = "available";
};

Room.prototype.addPerson = function(personID) {
    if (this.status === "available") {
        this.people.push(personID);
    }
};
Room.prototype.removePerson = function(personID) {
    var index = this.people.indexOf(personID);
    this.people.splice(index,1);
}


module.exports = Room;