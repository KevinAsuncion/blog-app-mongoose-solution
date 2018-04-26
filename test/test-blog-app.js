'use strict'

//Set up
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect; 

const {BlogPost} = require('../models');
const  {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

//Generate the data for the DB

function blogPostData() {
    console.info('seeding data');
    const seedData = [];
    for(let i = 1; i <= 10; i++){
        seedData.push(generatePostData());
    } 
    return BlogPost.insertMany(seedData);
}

function generatePostData(){
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(),
        content: faker.lorem.text()
    }
}

function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}
//Tests 

describe('Blog posts API', function(){
    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
       return blogPostData();
    });
    
    afterEach(function(){
       return tearDownDb();
    });
    
    after(function(){
       return closeServer(); 
    });

    describe('GET endpoint', function(){
        it('should return all blog posts', function(){
           let res; 
           return chai.request(app)
           .get('/posts')
           .then(function(_res){
               res = _res;
               expect(res).to.have.status(200);
               expect(res.body.posts).to.have.length.of.at.least(1);
               return BlogPost.count();
           })
           .then(function(count){
               expect(res.body.posts).to.have.length.of(count);
           });
        });
        
        it('should return posts with the correct fields', function(){
           let resPost;
           return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.posts).to.be.a('array');
                expect(res.body.posts).to.have.length.of.at.least(1);

                res.body.posts.forEach(function(post){
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys( 
                        'id','title','content','author', 'created'
                    );
                });
               resPost = res.body.posts[0];
               return BlogPost.findById(resPost.id)
            })
            .then(function(post){
                expect(resPost.id).to.equal(post.id);
                expect(resPost.title).to.equal(post.title);
                expect(resPost.content).to.equal(post.content);
                expect(resPost.author).to.equal(post.authorName);
            });
        });
    });

    describe('POST endpoint', function(){
        it('should ad a new blog post', function(){
            const newPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName(),
                },
                content: faker.lorem.text()
            };
            return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys(
                    'id', 'title', 'content', 'author', 'created'
                );
                expect(res.body.title).to.equal(newPost.title);
                expect(res.body.content).to.equal(newPost.content);
                expect(res.body.author.firstName).to.equal(newPost.author.firstName);
                expect(res.body.author.lastName).to.equal(newPost.author.lastName);
                expect(res.body.id).to.not.be.null;
                return BlogPost.findById(res.body.id);
            })
            .then(function(post){
                expect(post.title).to.equal(newPost.title);
                expect(post.content).to.equal(newPost.content;
                expect(post.author.firstName).to.equal(newPost.author.firstName);
                expect(post.author.lastName).to.equal(newPost.author.lastName);
            });
        });
    });

    describe('PUT endpoint', function(){
        it('should update the correct fields', function(){
            const updateData = {
                title: 'this is a new title',
                content: 'this is new content',
                author:{
                    firstName:'New firstName',
                    lastName: 'New lastName'
                }
            };
            return BlogPost
                findOne()
                .then(function(post){
                    updateData.id = post.id;
                    return chai.request(app)
                        .put('/posts/${post.id}')
                        .send(updateData);
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id)
                })
                .then(function(post){
                    expect(post.title).to.equal(updateData.title);
                    expect(post.content).to.equal(updateData.content);
                    expect(post.author.firstName).to.equal(updateData.author.firstName);
                    expect(post.author.lastName).to.equal(updateData.author.lastName);
                });
        });
    });

    describe('DELETE endpoint',function(){
        it('should delete a post',function(){
            let post; 
            return BlogPost 
                .findOne()
                .then(function(_post){
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`)
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post){
                    expect(_post).to.be.null;
                });
        });
    });
});

