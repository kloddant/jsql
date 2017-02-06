# jsql
A javascript, client-only MySQL database-equivalent framework for working with data in memory.

##Including

    <script src="jsql.js"></script>

##Instantiation

    var exampledatabase = new Database();
    
##CREATE TABLE

    exampledatabase.create_table(name='exampletable', structure={
        'id': new IntegerField(max_length=false, unique=true), 
        'name': new CharField(),
        }
    );

##INSERT

    exampledatabase.insert(fields={"id":"1", "name":"Bob"}, table='exampletable');

##UPDATE

    exampledatabase.update(fields={"id":"2", "name":"Tony"}, table='exampletable', where='`id` == 1');

##DELETE

    exampledatabase.delete(table='exampletable', where='`id` == 1');

##SELECT

    exampledatabase.select(fields=["id"], tables=[{'name':'exampletable', 'on':'true'}], where='`id` == 1');
